"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  initDB,
  getAlbumsByArtist,
  getAlbum,
  insertAlbum,
  getArtist,
  insertArtist,
  type Album,
  type Artist,
  type AlbumWithArtist,
} from "../database";
import { API_KEY } from "../constants";
import ArtistHeader from "../components/ArtistHeader";
import AlbumTabs from "../components/AlbumTabs";
import AlbumList from "../components/AlbumList";

export default function ArtistPage() {
  const [artist, setArtist] = useState<Artist | null>(null);
  const [libraryAlbums, setLibraryAlbums] = useState<AlbumWithArtist[]>([]);
  const [allAlbums, setAllAlbums] = useState<AlbumWithArtist[]>([]);
  const [artistName, setArtistName] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const handleHashChange = () => {
      setArtistName(decodeURIComponent(window.location.hash.substring(1)));
    };

    handleHashChange();
    window.addEventListener("hashchange", handleHashChange);

    return () => {
      window.removeEventListener("hashchange", handleHashChange);
    };
  }, []);

  useEffect(() => {
    if (!artistName) return;

    const fetchArtistData = async () => {
      setLoading(true);
      await initDB();

      // 1. Fetch artist details (for the header image)
      let artistData = getArtist(artistName);
      if (artistData && !artistData.imageUrl) {
        try {
          const response = await fetch(
            `https://www.theaudiodb.com/api/v1/json/${API_KEY}/search.php?s=${artistName}`
          );
          const data = await response.json();
          const imageUrl =
            data.artists?.[0]?.strArtistThumb || "/placeholder.svg";
          artistData = { ...artistData, imageUrl };
          insertArtist(artistData);
        } catch (error) {
          console.error("Error fetching artist image:", error);
          artistData = { ...artistData, imageUrl: "/placeholder.svg" };
        }
      }
      setArtist(artistData);

      // 2. Fetch albums from the local library
      const localAlbumData = getAlbumsByArtist(artistName);
      const albumsWithImages = await Promise.all(
        localAlbumData.map(async (album) => {
          if (album.imageUrl) {
            return album;
          }
          try {
            const response = await fetch(
              `https://www.theaudiodb.com/api/v1/json/${API_KEY}/searchalbum.php?s=${artistName}&a=${album.name}`
            );
            const data = await response.json();
            const imageUrl =
              data.album?.[0]?.strAlbumThumb || "/placeholder.svg";
            const newAlbum = {
              name: album.name,
              artistName: artistName,
              imageUrl,
            };
            insertAlbum(newAlbum);
            return { ...album, imageUrl };
          } catch (error) {
            console.error("Error fetching album image:", error);
            return { ...album, imageUrl: "/placeholder.svg" };
          }
        })
      );
      setLibraryAlbums(albumsWithImages);

      // 3. Fetch all albums from AudioDB API with caching
      const cachedAlbums = localStorage.getItem(`artist-albums-${artistName}`);
      if (cachedAlbums) {
        const { timestamp, data } = JSON.parse(cachedAlbums);
        if (Date.now() - timestamp < 24 * 60 * 60 * 1000) {
          // 24 hours
          setAllAlbums(data);
          setLoading(false);
          return;
        }
      }

      try {
        const response = await fetch(
          `https://www.theaudiodb.com/api/v1/json/${API_KEY}/searchalbum.php?s=${artistName}`
        );
        const data = await response.json();
        if (data.album) {
          const apiAlbums = data.album.map((a: any) => ({
            name: a.strAlbum,
            artistName: artistName,
            imageUrl: a.strAlbumThumb || "/placeholder.svg",
          }));
          setAllAlbums(apiAlbums);
          localStorage.setItem(
            `artist-albums-${artistName}`,
            JSON.stringify({ timestamp: Date.now(), data: apiAlbums })
          );
        }
      } catch (error) {
        console.error("Error fetching all albums:", error);
      }
      setLoading(false);
    };

    fetchArtistData();
  }, [artistName]);

  const isAlbumInLibrary = (albumName: string) => {
    return libraryAlbums.some((album) => album.name === albumName);
  };

  if (loading) {
    return (
      <main>
        <Link href="/artists" style={{ marginBottom: '1.5rem', display: 'inline-block' }}>
          &larr; Back to Artists
        </Link>
        <h1>Loading...</h1>
      </main>
    );
  }

  if (!artist) {
    return (
      <main>
        <Link href="/artists" style={{ marginBottom: '1.5rem', display: 'inline-block' }}>
          &larr; Back to Artists
        </Link>
        <h1>Loading...</h1>
      </main>
    );
  }

  return (
    <main>
      <Link href="/artists" style={{ marginBottom: '1.5rem', display: 'inline-block' }}>
        &larr; Back to Artists
      </Link>
      <ArtistHeader artistName={artist.name} artistImageUrl={artist.imageUrl} />
      <AlbumTabs
        allAlbums={<AlbumList albums={allAlbums} showLibraryIcon={isAlbumInLibrary} />}
        libraryAlbums={<AlbumList albums={libraryAlbums} />}
      />
    </main>
  );
}
