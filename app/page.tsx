"use client";

import { useState, useEffect } from "react";
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

  useEffect(() => {
    setIsApiSupported(
      typeof window !== "undefined" && "showDirectoryPicker" in window
    );
    initDB().then(() => {
      const albumsFromDB = getAlbums().map((name: string) => ({ name, tracks: [] }));
      setAlbums(albumsFromDB);
    });
  }, []);

  const handleDirectorySelection = async () => {
    try {
      setIsScanning(true);
      setScanningProgress(0);
      const directoryHandle = await window.showDirectoryPicker();
      const files: File[] = [];
      const processDirectory = async (directoryHandle: FileSystemDirectoryHandle) => {
        for await (const entry of directoryHandle.values()) {
          if (entry.kind === "file") {
            const lowerCaseName = entry.name.toLowerCase();
            if (
              lowerCaseName.endsWith(".mp3") ||
              lowerCaseName.endsWith(".flac")
            ) {
              files.push(await entry.getFile());
            }
          } else if (entry.kind === "directory") {
            await processDirectory(entry);
          }
        }
      };

      await processDirectory(directoryHandle);

      const jsmediatags = (await import("jsmediatags")).default;
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        await new Promise<void>((resolve) => {
          jsmediatags.read(file, {
            onSuccess: (tag) => {
              const tags = tag.tags;
              insertTrack({
                title: tags.title || "Unknown Title",
                artist: tags.artist || "Unknown Artist",
                album: tags.album || "Unknown Album",
                track: tags.track || "0",
              });
              resolve();
            },
            onError: (error) => {
              console.error(error);
              insertTrack({
                title: file.name,
                artist: "Unknown Artist",
                album: "Unknown Album",
                track: "0",
              });
              resolve();
            },
          });
        });
        setScanningProgress(((i + 1) / files.length) * 100);
      }
      await saveDbToIndexedDB();
      const albumsFromDB = getAlbums().map((name: string) => ({ name, tracks: [] }));
      setAlbums(albumsFromDB);
      setIsScanning(false);
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
