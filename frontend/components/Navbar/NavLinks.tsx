export default function NavLinks() {
  const links = [
    "Women",
    "Men",
    "Kids",
    "New Arrivals",
    "Collections",
  ];

  return (
    <ul className="hidden md:flex items-center gap-8 text-sm font-medium">
      {links.map((link) => (
        <li
          key={link}
          className="cursor-pointer transition-colors duration-300 hover:text-[var(--accent)]"
        >
          {link}
        </li>
      ))}
    </ul>
  );
}