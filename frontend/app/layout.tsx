import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import "./globals.css";

import { cookies } from "next/headers";

import Navbar from "@/components/Navbar";

import { prisma } from "@/lib/prisma";
import { verifySessionToken } from "@/lib/session";

import { AUTH_COOKIE_NAME } from "@/constants/cookies";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "LAHI",
    template: "%s | LAHI",
  },
  description:
    "AI-powered virtual fashion platform for personalized shopping.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  let user = null;

  try {
    const cookieStore = await cookies();

    const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;

    if (token) {
      const payload = await verifySessionToken(token);

      user = await prisma.user.findUnique({
        where: {
          id: payload.userId as string,
        },
        select: {
          id: true,
          fullName: true,
          email: true,
          profileImage: true,
        },
      });
    }
  } catch {
    user = null;
  }

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-screen bg-[#F8F6F2] text-[#111111]">
        <Navbar user={user} />

        <main className="flex-1">
          {children}
        </main>
      </body>
    </html>
  );
}