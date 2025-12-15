"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { initDB, getAllTracks } from "../database";
import type { Track } from "../database";
import LoadingSpinner from "../components/LoadingSpinner";

export default function TracksPage() {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTracks = async () => {
      await initDB();
      const trackData = getAllTracks();
      setTracks(trackData);
      setLoading(false);
    };
    fetchTracks();
  }, []);

  return (
    <main>
      <h1>Tracks</h1>
      {loading ? (
        <LoadingSpinner />
      ) : (
        <ul className="list">
          {tracks.map((track, index) => (
            <li key={index}>
              <Link
                href={`/album#${encodeURIComponent(
                  `${track.artist} - ${track.album}`
                )}`}
                className="list-item"
              >
                <div style={{ fontWeight: "bold" }}>{track.title}</div>
                <div>{track.artist}</div>
                <div>
                  {track.album} - Track {track.track}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
