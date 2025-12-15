"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { initDB, getArtists, getArtist, insertArtist, type Artist } from "../database";
import { API_KEY } from "../constants";
import LoadingSpinner from "../components/LoadingSpinner";

export default function ArtistsPage() {
  const [artists, setArtists] = useState<Artist[]>([]);
  const [loading, setLoading] = useState(true);

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
      setLoading(false);
    };
    fetchArtists();
  }, []);

  return (
    <main>
      <h1>Artists</h1>
      {loading ? (
        <LoadingSpinner />
      ) : (
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
                data-testid={artist.imageUrl === '/placeholder.svg' ? 'placeholder-image' : ''}
              />
              <h3>{artist.name}</h3>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
