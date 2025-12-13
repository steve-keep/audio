"use client";

import { useState, useEffect } from "react";

export default function Home() {
  const [audioFiles, setAudioFiles] = useState<string[]>([]);
  const [isApiSupported, setIsApiSupported] = useState(false);

  useEffect(() => {
    setIsApiSupported(typeof window !== 'undefined' && 'showDirectoryPicker' in window);
  }, []);

  const handleDirectorySelection = async () => {
    try {
      const directoryHandle = await window.showDirectoryPicker();
      const files: string[] = [];
      for await (const entry of directoryHandle.values()) {
        if (entry.kind === "file") {
          const lowerCaseName = entry.name.toLowerCase();
          if (lowerCaseName.endsWith(".mp3") || lowerCaseName.endsWith(".flac")) {
            files.push(entry.name);
          }
        }
      }
      setAudioFiles(files);
    } catch (error) {
      console.error("Error selecting directory:", error);
    }
  };

  return (
    <main>
      <h1>Audio File Indexer</h1>
      {isApiSupported ? (
        <button onClick={handleDirectorySelection}>Select Directory</button>
      ) : (
        <p>The File System Access API is not supported in your browser.</p>
      )}
      {audioFiles.length > 0 && (
        <ul>
          {audioFiles.map((file) => (
            <li key={file}>{file}</li>
          ))}
        </ul>
      )}
    </main>
  );
}
