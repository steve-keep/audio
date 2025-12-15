"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { initDB, getAlbumsByArtist, getAlbum, insertAlbum, type Album } from "../database";
import { API_KEY } from "../constants";

export default function ArtistPage() {
  const [albums, setAlbums] = useState<Album[]>([]);
  const [artistName, setArtistName] = useState("");

  useEffect(() => {
    const handleHashChange = () => {
      setArtistName(decodeURIComponent(window.location.hash.substring(1)));
    };

    handleHashChange(); // Set the initial artist name
    window.addEventListener("hashchange", handleHashChange);

    return () => {
      window.removeEventListener("hashchange", handleHashChange);
    };
  }, []);

  useEffect(() => {
    if (!artistName) return;
    const fetchAlbums = async () => {
      await initDB();
      const albumNames = getAlbumsByArtist(artistName);

      const albumData = await Promise.all(
        albumNames.map(async (name) => {
          let album = getAlbum(name, artistName);
          if (album && album.imageUrl) {
            return album;
          }

          try {
            const response = await fetch(
              `https://www.theaudiodb.com/api/v1/json/${API_KEY}/searchalbum.php?s=${artistName}&a=${name}`
            );
            const data = await response.json();
            const imageUrl = data.album?.[0]?.strAlbumThumb || "/placeholder.svg";
            album = { name, artistName, imageUrl };
            insertAlbum(album);
            return album;
          } catch (error) {
            console.error("Error fetching album image:", error);
            return { name, artistName, imageUrl: "/placeholder.svg" };
          }
        })
      );
      setAlbums(albumData);
    };

    fetchAlbums();
  }, [artistName]);

  return (
    <main>
      <Link href="/artists" style={{ marginBottom: '1.5rem', display: 'inline-block' }}>
        &larr; Back to Artists
      </Link>
      <h1>{artistName}</h1>
      <div className="grid-container">
        {albums.map((album) => (
          <div key={album.name} className="grid-item">
            <img
              src={album.imageUrl}
              alt={album.name}
              data-testid={album.imageUrl === '/placeholder.svg' ? 'placeholder-image' : ''}
            />
            <h3>{album.name}</h3>
          </div>
        ))}
      </div>
    </main>
  );
}
