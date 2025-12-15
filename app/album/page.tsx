"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { initDB, getAlbum, getTracksByAlbumAndArtist, type Track, type Album } from "../database";

export default function AlbumPage() {
  const [album, setAlbum] = useState<Album | null>(null);
  const [tracks, setTracks] = useState<Track[]>([]);

  useEffect(() => {
    const handleHashChange = async () => {
      const hash = window.location.hash.substring(1);
      if (!hash) return;

      const [artistName, albumName] = decodeURIComponent(hash).split(" - ");
      if (!artistName || !albumName) return;

      await initDB();
      const albumData = getAlbum(albumName, artistName);
      setAlbum(albumData);

      if (albumData) {
        const trackData = getTracksByAlbumAndArtist(albumName, artistName);
        setTracks(trackData);
      }
    };

    handleHashChange();
    window.addEventListener("hashchange", handleHashChange);

    return () => {
      window.removeEventListener("hashchange", handleHashChange);
    };
  }, []);

  if (!album) {
    return (
      <main>
        <h1>Loading...</h1>
      </main>
    );
  }

  return (
    <main>
      <Link href="/albums" style={{ marginBottom: '1.5rem', display: 'inline-block' }}>
        &larr; Back to Albums
      </Link>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '2rem' }}>
        <img
          src={album.imageUrl}
          alt={album.name}
          width="150"
          height="150"
          style={{ objectFit: "cover", borderRadius: "8px", marginRight: '1.5rem' }}
        />
        <div>
          <h1>{album.name}</h1>
          <p style={{ fontSize: '1.2rem', opacity: 0.8 }}>{album.artistName}</p>
        </div>
      </div>

      <ul style={{ listStyle: 'none', padding: 0 }}>
        {tracks.map((track, index) => (
          <li key={index} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
            <div>
              <div style={{ fontWeight: 'bold' }}>{track.title}</div>
              <div>{track.artist}</div>
            </div>
            <div style={{ opacity: 0.7 }}>{track.track}</div>
          </li>
        ))}
      </ul>
    </main>
  );
}
