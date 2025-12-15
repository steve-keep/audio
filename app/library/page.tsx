import Link from "next/link";
import MusicalNoteIcon from "../components/icons/MusicalNoteIcon";
import SettingsIcon from "../components/icons/SettingsIcon";
import UserIcon from "../components/icons/UserIcon";
import DiscIcon from "../components/icons/DiscIcon";

export default function Library() {
  const libraryItems = [
    {
      href: "/albums",
      icon: <DiscIcon />,
      label: "Albums",
    },
    {
      href: "/artists",
      icon: <UserIcon />,
      label: "Artists",
    },
    {
      href: "/tracks",
      icon: <MusicalNoteIcon />,
      label: "Tracks",
    },
  ];

  return (
    <main>
      <div className="library-header">
        <h1 className="library-title">My library</h1>
        <Link href="/settings" className="settings-icon" data-testid="settings-link">
          <SettingsIcon />
        </Link>
      </div>
      <div className="library-menu">
        {libraryItems.map(({ href, icon, label }) => (
          <Link href={href} key={href} className="library-menu-item">
            {icon}
            <span className="label">{label}</span>
          </Link>
        ))}
      </div>
    </main>
  );
}
