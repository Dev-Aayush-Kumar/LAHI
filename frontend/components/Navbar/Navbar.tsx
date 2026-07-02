import NavLinks from "./NavLinks";
import NavIcons from "./NavIcons";
import SearchBar from "@/components/Search/SearchBar";
type NavbarProps = {
  user?: {
    id: string;
    fullName: string;
    email: string;
    profileImage: string | null;
  } | null;
};

export default function Navbar({
  user,
}: Readonly<NavbarProps>) {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-[var(--border)] bg-white">
      <nav className="mx-auto flex h-18 max-w-7xl items-center justify-between px-6">
        <h1 className="cursor-pointer text-2xl font-bold tracking-wide">
          LAHI
        </h1>

        <NavLinks />

        <div className="flex items-center gap-6">
          <SearchBar />

          <NavIcons user={user} />
        </div>
      </nav>
    </header>
  );
}