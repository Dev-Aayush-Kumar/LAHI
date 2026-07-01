import Link from "next/link";
import { getCartItemCount } from "@/lib/cartCount";
import {
  Search,
  Heart,
  ShoppingBag,
  User,
} from "lucide-react";

type NavIconsProps = {
  user?: {
    id: string;
    fullName: string;
    email: string;
    profileImage: string | null;
  } | null;
};

export default async function NavIcons({
  user,
}: Readonly<NavIconsProps>) {
  const isLoggedIn = !!user;
  const cartCount = await getCartItemCount();
  return (
    <div className="flex items-center gap-5">
      <button
        type="button"
        className="transition hover:text-[var(--accent)]"
        aria-label="Search"
      >
        <Search size={20} />
      </button>

      <Link
        href="/wishlist"
        className="transition hover:text-[var(--accent)]"
        aria-label="Wishlist"
      >
        <Heart size={20} />
      </Link>

      <Link
        href="/cart"
        className="relative transition hover:text-[var(--accent)]"
        aria-label="Shopping Bag"
      >
        <ShoppingBag size={20} />

        {cartCount > 0 && (
          <span
            className="
            absolute
            -right-2
            -top-2
            flex
            h-5
            w-5
            items-center
            justify-center
            rounded-full
            bg-black
            text-[10px]
            font-bold
            text-white
            "
          >
            {cartCount}
          </span>
        )}
      </Link>

      {isLoggedIn ? (
        <Link
          href="/profile"
          className="flex items-center gap-2 transition hover:text-[var(--accent)]"
          aria-label="Profile"
        >
          <User size={20} />

          <span className="hidden lg:inline text-sm font-medium">
            {user.fullName.split(" ")[0]}
          </span>
        </Link>
      ) : (
        <Link
          href="/login"
          className="flex items-center gap-2 transition hover:text-[var(--accent)]"
          aria-label="Login"
        >
          <User size={20} />

          <span className="hidden lg:inline text-sm font-medium">
            Login
          </span>
        </Link>
      )}
    </div>
  );
}