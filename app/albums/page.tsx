"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { initDB, getAllAlbums } from "../database";
import type { AlbumWithArtist } from "../database";

export default function AlbumsPage() {
  const [albums, setAlbums] = useState<AlbumWithArtist[]>([]);

  useEffect(() => {
    const fetchAlbums = async () => {
      await initDB();
      const albumData = getAllAlbums();
      setAlbums(albumData);
    };
    fetchAlbums();
  }, []);

  return (
    <main>
      <h1>Albums</h1>
      <div className="grid-container">
        {albums.map((album) => (
          <Link
            href={`/album#${encodeURIComponent(album.artistName)}/${encodeURIComponent(album.name)}`}
            key={`${album.artistName}-${album.name}`}
            className="grid-item"
          >
            <img
              src={album.imageUrl}
              alt={album.name}
              data-testid={album.imageUrl === '/placeholder.svg' ? 'placeholder-image' : ''}
            />
            <h3>{album.name}</h3>
            <p>{album.artistName}</p>
          </Link>
        ))}
      </div>
    </main>
  );
}
