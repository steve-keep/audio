"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import HomeIcon from "./icons/HomeIcon";
import SearchIcon from "./icons/SearchIcon";
import LibraryIcon from "./icons/LibraryIcon";

export default function NavBar() {
  const pathname = usePathname();
  // The basePath is configured in next.config.mjs
  const basePath = "/audio";

  const navItems = [
    { href: "/", icon: <HomeIcon />, label: "Home" },
    { href: "/search", icon: <SearchIcon />, label: "Search" },
    { href: "/library", icon: <LibraryIcon />, label: "Library" },
  ];

  return (
    <nav className="nav-bar">
      {navItems.map(({ href, icon, label }) => {
        let isActive;

        // usePathname() doesn't include the basePath, so we compare against the raw href
        if (href === "/library") {
          isActive =
            pathname.startsWith('/library') ||
            pathname.startsWith('/artists') ||
            pathname.startsWith('/artist') ||
            pathname.startsWith('/albums') ||
            pathname.startsWith('/album') ||
            pathname.startsWith('/tracks');
        } else if (href === "/") {
          // Exact match for the home page
          isActive = pathname === href;
        } else {
          // StartsWith match for other pages like /search
          isActive = pathname.startsWith(href);
        }

        const className = isActive ? "active" : "";

        return (
          <Link key={href} href={href} className={className}>
            {icon}
          </Link>
        );
      })}
    </nav>
  );
}
