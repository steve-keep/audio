"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import HomeIcon from "./icons/HomeIcon";
import SearchIcon from "./icons/SearchIcon";
import LibraryIcon from "./icons/LibraryIcon";

export default function NavBar() {
  const pathname = usePathname();

  const navItems = [
    { href: "/", icon: <HomeIcon />, label: "Home" },
    { href: "/search", icon: <SearchIcon />, label: "Search" },
    { href: "/library", icon: <LibraryIcon />, label: "Library" },
  ];

  return (
    <nav className="nav-bar">
      {navItems.map(({ href, icon, label }) => (
        <Link
          key={href}
          href={href}
          className={pathname === href ? "active" : ""}
        >
          {icon}
          <span>{label}</span>
        </Link>
      ))}
    </nav>
  );
}
