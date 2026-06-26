import NavLinks from "./NavLinks";
import NavIcons from "./NavIcons";

export default function Navbar() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-[var(--border)] bg-white">
      <nav className="mx-auto flex h-18 max-w-7xl items-center justify-between px-6">

        <h1 className="cursor-pointer text-2xl font-bold tracking-wide">
          LAHI
        </h1>

        <NavLinks />

        <NavIcons />

      </nav>
    </header>
  );
}