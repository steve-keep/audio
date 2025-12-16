"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { initDB, getArtists, getArtist, insertArtist, type Artist } from "../database";
import { API_KEY } from "../constants";

export default function ArtistsPage() {
  const [artists, setArtists] = useState<Artist[]>([]);

  useEffect(() => {
    const fetchArtists = async () => {
      await initDB();
      const artistsFromDB = getArtists();
      const artistsWithImages = await Promise.all(
        artistsFromDB.map(async (artist) => {
          if (artist.imageUrl) {
            return artist;
          }

          try {
            const response = await fetch(
              `https://www.theaudiodb.com/api/v1/json/${API_KEY}/search.php?s=${artist.name}`
            );
            const data = await response.json();
            const imageUrl = data.artists?.[0]?.strArtistThumb || "/placeholder.svg";
            const updatedArtist = { ...artist, imageUrl };
            insertArtist({ name: updatedArtist.name, imageUrl: updatedArtist.imageUrl });
            return updatedArtist;
          } catch (error) {
            console.error("Error fetching artist image:", error);
            return { ...artist, imageUrl: "/placeholder.svg" };
          }
        })
      );
      setArtists(artistsWithImages);
    };
    fetchArtists();
  }, []);

  return (
    <main>
      <h1>Artists</h1>
      <div className="grid-container">
        {artists.map((artist) => (
          <Link
            href={`/artist#${encodeURIComponent(artist.name)}`}
            key={artist.name}
            className="grid-item"
          >
            <img
              src={artist.imageUrl}
              alt={artist.name}
              className="artist-image"
              data-testid={artist.imageUrl === '/placeholder.svg' ? 'placeholder-image' : ''}
            />
            <h3>{artist.name}</h3>
          </Link>
        ))}
      </div>
    </main>
  );
}
