"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { initDB, getTracksByAlbumAndArtist, getAlbum, insertAlbum, type TrackWithAlbumAndArtist, type AlbumWithArtist } from "../database";
import { API_KEY } from "../constants";

export default function AlbumPage() {
  const [tracks, setTracks] = useState<TrackWithAlbumAndArtist[]>([]);
  const [album, setAlbum] = useState<AlbumWithArtist | null>(null);
  const [albumName, setAlbumName] = useState("");
  const [artistName, setArtistName] = useState("");

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.substring(1);
      const [artist, album] = hash.split("/").map(decodeURIComponent);
      setArtistName(artist || "");
      setAlbumName(album || "");
    };

    handleHashChange();
    window.addEventListener("hashchange", handleHashChange);

    return () => {
      window.removeEventListener("hashchange", handleHashChange);
    };
  }, []);

  useEffect(() => {
    if (!albumName || !artistName) return;

    const fetchAlbumData = async () => {
      await initDB();

      // Fetch tracks
      const trackData = getTracksByAlbumAndArtist(albumName, artistName);
      setTracks(trackData);

      // Fetch album details for the cover art
      const albumData = getAlbum(albumName, artistName);
      if (albumData && !albumData.imageUrl) {
        try {
          const response = await fetch(
            `https://www.theaudiodb.com/api/v1/json/${API_KEY}/searchalbum.php?s=${artistName}&a=${albumName}`
          );
          const data = await response.json();
          const imageUrl = data.album?.[0]?.strAlbumThumb || "/placeholder.svg";
          insertAlbum({ name: albumName, artistName, imageUrl });
          // Re-fetch the album data to get the complete object
          const updatedAlbumData = getAlbum(albumName, artistName);
          setAlbum(updatedAlbumData);
        } catch (error) {
          console.error("Error fetching album image:", error);
          // Even on error, try to set the existing data if it exists
          if (albumData) {
            setAlbum({ ...albumData, imageUrl: "/placeholder.svg" });
          }
        }
      } else {
        setAlbum(albumData);
      }
    };

    fetchAlbumData();
  }, [albumName, artistName]);

  return (
    <main>
      <Link href={`/artist#${encodeURIComponent(artistName)}`} style={{ marginBottom: '1.5rem', display: 'inline-block' }}>
        &larr; Back to {artistName}
      </Link>

      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1.5rem' }}>
        {album && (
          <img
            src={album.imageUrl}
            alt={album.name}
            style={{ width: '150px', height: '150px', objectFit: 'cover', borderRadius: '8px', marginRight: '1.5rem' }}
          />
        )}
        <div>
          <h1>{albumName}</h1>
          <h2 style={{ marginTop: '-1rem', opacity: 0.8 }}>{artistName}</h2>
        </div>
      </div>

      <ul className="list">
        {tracks.map((track) => (
          <li key={track.id} className="list-item">
            {track.track}. {track.title}
          </li>
        ))}
      </ul>
    </main>
  );
}
