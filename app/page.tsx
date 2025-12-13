"use client";

import { useState, useEffect, useRef } from "react";
import {
  initDB,
  insertTrack,
  getAlbums,
  getTracksByAlbum,
  saveDbToIndexedDB,
} from "./database";

interface Track {
  title: string;
  artist: string;
  album: string;
  track: string;
}

interface Album {
  name: string;
  tracks: Track[];
}

export default function Home() {
  const [albums, setAlbums] = useState<Album[]>([]);
  const [expandedAlbum, setExpandedAlbum] = useState<string | null>(null);
  const [isApiSupported, setIsApiSupported] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scanningProgress, setScanningProgress] = useState(0);
  const workerRef = useRef<Worker>();

  useEffect(() => {
    setIsApiSupported(
      typeof window !== "undefined" && "showDirectoryPicker" in window
    );
    initDB().then(() => {
      const albumsFromDB = getAlbums().map((name: string) => ({ name, tracks: [] }));
      setAlbums(albumsFromDB);
    });

    workerRef.current = new Worker(
      new URL("./scanner.worker.ts", import.meta.url)
    );
    workerRef.current.onmessage = async (
      event: MessageEvent<{ type: string; payload: any }>
    ) => {
      if (event.data.type === "progress") {
        setScanningProgress(event.data.payload);
      } else if (event.data.type === "complete") {
        const tracks = event.data.payload as Track[];
        for (const track of tracks) {
          insertTrack(track);
        }
        await saveDbToIndexedDB();
        const albumsFromDB = getAlbums().map((name: string) => ({
          name,
          tracks: [],
        }));
        setAlbums(albumsFromDB);
        setIsScanning(false);
      } else if (event.data.type === "error") {
        console.error(event.data.payload);
        setIsScanning(false);
      }
    };

    return () => {
      workerRef.current?.terminate();
    };
  }, []);

  const handleDirectorySelection = async () => {
    try {
      setIsScanning(true);
      setScanningProgress(0);
      const directoryHandle = await window.showDirectoryPicker();
      workerRef.current?.postMessage(directoryHandle);
    } catch (error) {
      console.error("Error selecting directory:", error);
      setIsScanning(false);
    }
  };

  const toggleAlbum = (albumName: string) => {
    if (expandedAlbum === albumName) {
      setExpandedAlbum(null);
    } else {
      const tracks = getTracksByAlbum(albumName);
      const newAlbums = albums.map((album) =>
        album.name === albumName ? { ...album, tracks } : album
      );
      setAlbums(newAlbums);
      setExpandedAlbum(albumName);
    }
  };

  return (
    <main>
      <h1>Audio File Indexer</h1>
      {isApiSupported ? (
        <button onClick={handleDirectorySelection} disabled={isScanning}>
          {isScanning ? "Scanning..." : "Select Directory"}
        </button>
      ) : (
        <p>The File System Access API is not supported in your browser.</p>
      )}
      {isScanning && (
        <progress value={scanningProgress} max="100"></progress>
      )}
      {albums.length > 0 && (
        <ul>
          {albums.map((album) => (
            <li key={album.name}>
              <h2
                onClick={() => toggleAlbum(album.name)}
                style={{ cursor: "pointer" }}
              >
                {album.name}
              </h2>
              {expandedAlbum === album.name && (
                <ul>
                  {album.tracks.map((track) => (
                    <li key={track.title}>
                      {track.track} - {track.title}
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
