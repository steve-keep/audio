"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import MusicalNoteIcon from "../components/icons/MusicalNoteIcon";
import {
  initDB,
  getArtistCount,
  getAlbumCount,
  getTrackCount,
} from "../database";
import SettingsIcon from "../components/icons/SettingsIcon";
import UserIcon from "../components/icons/UserIcon";
import DiscIcon from "../components/icons/DiscIcon";

interface LibraryStats {
  artists: number;
  albums: number;
  tracks: number;
}

export default function Library() {
  const [stats, setStats] = useState<LibraryStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      await initDB();
      setStats({
        artists: getArtistCount(),
        albums: getAlbumCount(),
        tracks: getTrackCount(),
      });
      setLoading(false);
    }
    fetchStats();
  }, []);

  const libraryItems = [
    {
      href: "/artists",
      icon: <UserIcon />,
      label: "Artists",
      count: stats?.artists,
    },
    {
      href: "/albums",
      icon: <DiscIcon />,
      label: "Albums",
      count: stats?.albums,
    },
    {
      href: "/tracks",
      icon: <MusicalNoteIcon />,
      label: "Tracks",
      count: stats?.tracks,
    },
  ];

  if (loading) {
    return (
      <main>
        <div className="header">
          <h1>My Library</h1>
          <Link href="/settings" data-testid="settings-link">
            <SettingsIcon />
          </Link>
        </div>
        <div className="library-list">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="library-list-item">
              <a>
                <div className="skeleton-icon" />
                <div className="skeleton-text" />
                <div className="skeleton-text-small" />
              </a>
            </div>
          ))}
        </div>
      </main>
    );
  }

  return (
    <main>
      <div className="header">
        <h1>My Library</h1>
        <Link href="/settings" data-testid="settings-link">
          <SettingsIcon />
        </Link>
      </div>
      <ul className="library-list">
        {libraryItems.map(({ href, icon, label, count }) => (
          <li key={href} className="library-list-item">
            <Link href={href}>
              {icon}
              <span className="label">{label}</span>
              <span className="count">
                {count}{" "}
                {count === 1
                  ? label.slice(0, -1).toLowerCase()
                  : label.toLowerCase()}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
