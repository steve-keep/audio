"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { initDB, getAllTracks } from "../database";
import type { TrackWithAlbumAndArtist } from "../database";

export default function TracksPage() {
  const [tracks, setTracks] = useState<TrackWithAlbumAndArtist[]>([]);

  useEffect(() => {
    const fetchTracks = async () => {
      await initDB();
      const trackData = getAllTracks();
      setTracks(trackData);
    };
    fetchTracks();
  }, []);

  return (
    <main>
      <h1>Tracks</h1>
      <ul className="list">
        {tracks.map((track) => (
          <li key={track.id}>
            <Link
              href={`/album#${encodeURIComponent(track.artistName)}/${encodeURIComponent(track.albumName)}`}
              className="list-item"
            >
              <div style={{ fontWeight: 'bold' }}>{track.title}</div>
              <div>{track.artistName}</div>
              <div>{track.albumName} - Track {track.track}</div>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
