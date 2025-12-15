"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import BurgerMenu from "./components/BurgerMenu";
import { initDB, getArtists, getArtist, insertArtist } from "./database";
import { API_KEY } from "./constants";

interface Artist {
  name: string;
  imageUrl: string;
}

export default function Home() {
  const [artists, setArtists] = useState<Artist[]>([]);

  useEffect(() => {
    const fetchArtists = async () => {
      await initDB();
      const artistNames = getArtists();
      const artistData = await Promise.all(
        artistNames.map(async (name) => {
          let artist = getArtist(name);
          if (artist && artist.imageUrl) {
            return artist;
          }

          try {
            const response = await fetch(
              `https://www.theaudiodb.com/api/v1/json/${API_KEY}/search.php?s=${name}`
            );
            const data = await response.json();
            const imageUrl = data.artists?.[0]?.strArtistThumb || "/placeholder.svg";
            artist = { name, imageUrl };
            insertArtist(artist);
            return artist;
          } catch (error) {
            console.error("Error fetching artist image:", error);
            return { name, imageUrl: "/placeholder.svg" };
          }
        })
      );
      setArtists(artistData);
    };
    fetchArtists();
  }, []);

  return (
    <main>
      <BurgerMenu />
      <h1>Artists</h1>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
          gap: "1rem",
        }}
      >
        {artists.map((artist) => (
          <Link
            href={`/artist/${encodeURIComponent(artist.name)}`}
            key={artist.name}
            style={{ textDecoration: "none", color: "inherit" }}
          >
            <div style={{ textAlign: "center" }}>
              <img
                src={artist.imageUrl}
                alt={artist.name}
                data-testid={artist.imageUrl === '/placeholder.svg' ? 'placeholder-image' : ''}
                width="150"
                height="150"
                style={{ objectFit: "cover", borderRadius: "8px" }}
              />
              <h3>{artist.name}</h3>
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}
