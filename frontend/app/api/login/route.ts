import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcrypt";

import { prisma } from "@/lib/prisma";
import { createSessionToken } from "@/lib/session";

import { AUTH_COOKIE_NAME } from "@/constants/cookies";
import { SESSION_DURATION } from "@/constants/auth";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        {
          success: false,
          message: "Please fill all fields.",
        },
        {
          status: 400,
        }
      );
    }

    const user = await prisma.user.findUnique({
      where: {
        email,
      },
    });

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: "No account found with this email.",
        },
        {
          status: 404,
        }
      );
    }

    const passwordMatches = await bcrypt.compare(
      password,
      user.passwordHash
    );

    if (!passwordMatches) {
      return NextResponse.json(
        {
          success: false,
          message: "Incorrect password.",
        },
        {
          status: 401,
        }
      );
    }

    await prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        lastLoginAt: new Date(),
      },
    });
    const guestSessionId =
      request.cookies.get("lahi_cart")?.value;

    if (guestSessionId) {
      const guestCart =
        await prisma.cart.findFirst({
          where: {
            sessionId: guestSessionId,
          },
          include: {
            items: true,
          },
        });

      if (guestCart) {
        const userCart =
          await prisma.cart.findFirst({
            where: {
              userId: user.id,
            },
            include: {
              items: true,
            },
          });

        if (!userCart) {
          // User has no cart
          await prisma.cart.update({
            where: {
              id: guestCart.id,
            },
            data: {
              userId: user.id,
              sessionId: null,
            },
          });
        } else {
          // Merge guest items into existing cart
          for (const guestItem of guestCart.items) {
            const existing =
              userCart.items.find(
                (item) =>
                  item.variantId === guestItem.variantId
              );

            if (existing) {
              await prisma.cartItem.update({
                where: {
                  id: existing.id,
                },
                data: {
                  quantity: {
                    increment:
                      guestItem.quantity,
                  },
                },
              });
            } else {
              await prisma.cartItem.create({
                data: {
                  cartId: userCart.id,
                  variantId:
                    guestItem.variantId,
                  quantity:
                    guestItem.quantity,
                },
              });
            }
          }

          await prisma.cart.delete({
            where: {
              id: guestCart.id,
            },
          });
        }
      }
    }
    const token = await createSessionToken({
      userId: user.id,
      email: user.email,
    });

    const response = NextResponse.json({
      success: true,
      message: "Login successful.",
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        profileImage: user.profileImage,
      },
    });

    response.cookies.set({
      name: AUTH_COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_DURATION,
    });
    response.cookies.set({
      name: "lahi_cart",
      value: "",
      path: "/",
      maxAge: 0,
    });
    return response;
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        success: false,
        message: "Internal server error.",
      },
      {
        status: 500,
      }
    );
  }
}