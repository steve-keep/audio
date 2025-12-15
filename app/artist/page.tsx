"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { initDB, getAlbumsByArtist, getAlbum, insertAlbum } from "../database";
import { API_KEY } from "../constants";

interface Album {
  name: string;
  imageUrl: string;
}

export const hashChangeHandler = (setArtistName: (name: string) => void) => {
  setArtistName(decodeURIComponent(window.location.hash.substring(1)));
};

export default function ArtistPage() {
  const [albums, setAlbums] = useState<Album[]>([]);
  const [artistName, setArtistName] = useState("");

  useEffect(() => {
    const handler = () => hashChangeHandler(setArtistName);
    hashChangeHandler(setArtistName);
    window.addEventListener("hashchange", handler);
    return () => {
      window.removeEventListener("hashchange", handler);
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
      <Link href="/">Back to Artists</Link>
      <h1>{artistName}</h1>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
          gap: "1rem",
        }}
      >
        {albums.map((album) => (
          <div key={album.name} style={{ textAlign: "center" }}>
            <img
              src={album.imageUrl}
              alt={album.name}
              data-testid={album.imageUrl === '/placeholder.svg' ? 'placeholder-image' : ''}
              width="150"
              height="150"
              style={{ objectFit: "cover", borderRadius: "8px" }}
            />
            <h3>{album.name}</h3>
          </div>
        ))}
      </div>
    </main>
  );
}
