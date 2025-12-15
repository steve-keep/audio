"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import MicrophoneIcon from "../components/icons/MicrophoneIcon";
import VinylIcon from "../components/icons/VinylIcon";
import MusicalNoteIcon from "../components/icons/MusicalNoteIcon";
import {
  initDB,
  getArtistCount,
  getAlbumCount,
  getTrackCount,
} from "../database";

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
      icon: <MicrophoneIcon />,
      label: "Artists",
      count: stats?.artists,
    },
    {
      href: "/albums",
      icon: <VinylIcon />,
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
        <h1>My Library</h1>
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
      <h1>My Library</h1>
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
