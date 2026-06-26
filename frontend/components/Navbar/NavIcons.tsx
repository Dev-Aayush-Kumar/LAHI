import {
  Search,
  Heart,
  ShoppingBag,
  User,
} from "lucide-react";

export default function NavIcons() {
  return (
    <div className="flex items-center gap-5">

      <Search
        size={20}
        className="cursor-pointer transition hover:text-[var(--accent)]"
      />

      <Heart
        size={20}
        className="cursor-pointer transition hover:text-[var(--accent)]"
      />

      <ShoppingBag
        size={20}
        className="cursor-pointer transition hover:text-[var(--accent)]"
      />

      <User
        size={20}
        className="cursor-pointer transition hover:text-[var(--accent)]"
      />

    </div>
  );
}