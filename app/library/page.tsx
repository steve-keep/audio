import Link from "next/link";
import ArtistIcon from "../components/icons/ArtistIcon";
import AlbumIcon from "../components/icons/AlbumIcon";
import TrackIcon from "../components/icons/TrackIcon";

export default function Library() {
  const libraryItems = [
    { href: "/artists", icon: <ArtistIcon />, label: "Artists" },
    { href: "/albums", icon: <AlbumIcon />, label: "Albums" },
    { href: "/tracks", icon: <TrackIcon />, label: "Tracks" },
  ];

  return (
    <main>
      <h1>My library</h1>
      <ul className="library-list">
        {libraryItems.map(({ href, icon, label }) => (
          <li key={href} className="library-list-item">
            <Link href={href}>
              {icon}
              <span>{label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
