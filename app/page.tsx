"use client";

import { useState, useEffect } from "react";

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

  useEffect(() => {
    setIsApiSupported(
      typeof window !== "undefined" && "showDirectoryPicker" in window
    );
  }, []);

  const handleDirectorySelection = async () => {
    try {
      const directoryHandle = await window.showDirectoryPicker();
      const files: File[] = [];
      for await (const entry of directoryHandle.values()) {
        if (entry.kind === "file") {
          const lowerCaseName = entry.name.toLowerCase();
          if (
            lowerCaseName.endsWith(".mp3") ||
            lowerCaseName.endsWith(".flac")
          ) {
            files.push(await entry.getFile());
          }
        }
      }

      const jsmediatags = (await import("jsmediatags")).default;
      const allTracks: Track[] = await Promise.all(
        files.map(
          (file) =>
            new Promise<Track>((resolve, reject) => {
              jsmediatags.read(file, {
                onSuccess: (tag) => {
                  const tags = tag.tags;
                  resolve({
                    title: tags.title || "Unknown Title",
                    artist: tags.artist || "Unknown Artist",
                    album: tags.album || "Unknown Album",
                    track: tags.track || "0",
                  });
                },
                onError: (error) => {
                  console.error(error);
                  // Resolve with a default track to avoid breaking the process
                  resolve({
                    title: file.name,
                    artist: "Unknown Artist",
                    album: "Unknown Album",
                    track: "0",
                  });
                },
              });
            })
        )
      );

      const groupedByAlbum: { [key: string]: Track[] } = allTracks.reduce(
        (acc, track) => {
          (acc[track.album] = acc[track.album] || []).push(track);
          return acc;
        },
        {} as { [key: string]: Track[] }
      );

      const sortedAlbums: Album[] = Object.keys(groupedByAlbum)
        .map((albumName) => ({
          name: albumName,
          tracks: groupedByAlbum[albumName].sort((a, b) => {
            const trackA = parseInt(a.track.split('/')[0], 10);
            const trackB = parseInt(b.track.split('/')[0], 10);
            return trackA - trackB;
          }),
        }))
        .sort((a, b) => a.name.localeCompare(b.name));

      setAlbums(sortedAlbums);
    } catch (error) {
      console.error("Error selecting directory:", error);
    }
  };

  const toggleAlbum = (albumName: string) => {
    setExpandedAlbum(expandedAlbum === albumName ? null : albumName);
  };

  return (
    <main>
      <h1>Audio File Indexer</h1>
      {isApiSupported ? (
        <button onClick={handleDirectorySelection}>Select Directory</button>
      ) : (
        <p>The File System Access API is not supported in your browser.</p>
      )}
      {albums.length > 0 && (
        <ul>
          {albums.map((album) => (
            <li key={album.name}>
              <h2 onClick={() => toggleAlbum(album.name)} style={{ cursor: 'pointer' }}>
                {album.name}
              </h2>
              {expandedAlbum === album.name && (
                <ul>
                  {album.tracks.map((track) => (
                    <li key={track.title}>{track.track} - {track.title}</li>
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
