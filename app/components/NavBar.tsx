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
        // Construct the full path including the basePath for comparison
        const fullPath = href === "/" ? basePath : `${basePath}${href}`;
        const isActive = pathname === fullPath;

        const getClassName = () => {
          if (!isActive) return "";
          if (href === "/library") return "active-library";
          return "active";
        };

        return (
          <Link key={href} href={href} className={getClassName()}>
            {icon}
          </Link>
        );
      })}
    </nav>
  );
}
