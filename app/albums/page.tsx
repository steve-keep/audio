"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { initDB, getAllAlbums } from "../database";
import type { Album } from "../database";
import LoadingSpinner from "../components/LoadingSpinner";

export default function AlbumsPage() {
  const [albums, setAlbums] = useState<Album[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAlbums = async () => {
      await initDB();
      const albumData = getAllAlbums();
      setAlbums(albumData);
      setLoading(false);
    };
    fetchAlbums();
  }, []);

  return (
    <main>
      <h1>Albums</h1>
      {loading ? (
        <LoadingSpinner />
      ) : (
        <div className="grid-container">
          {albums.map((album) => (
            <Link
              href={`/album#${encodeURIComponent(
                `${album.artistName} - ${album.name}`
              )}`}
              key={`${album.artistName}-${album.name}`}
              className="grid-item"
            >
              <img
                src={album.imageUrl}
                alt={album.name}
                data-testid={
                  album.imageUrl === "/placeholder.svg" ? "placeholder-image" : ""
                }
              />
              <h3>{album.name}</h3>
              <p>{album.artistName}</p>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
