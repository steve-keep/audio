"use client";

import { useState, useEffect, useRef } from "react";
import {
  initDB,
  insertTrack,
  saveDbToIndexedDB,
  exportDB,
  restoreDB,
} from "../database";

interface Track {
  title: string;
  artist: string;
  album: string;
  track: string;
}

export default function Settings() {
  const [isApiSupported, setIsApiSupported] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scanningProgress, setScanningProgress] = useState(0);
  const [restoreFile, setRestoreFile] = useState<File | null>(null);
  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    setIsApiSupported(
      typeof window !== "undefined" && "showDirectoryPicker" in window
    );
    initDB();

    workerRef.current = new Worker(
      new URL("../scanner.worker.ts", import.meta.url)
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

  const handleBackup = () => {
    const data = exportDB();
    if (data) {
      const blob = new Blob([data.buffer]);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "audio-indexer.db";
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const handleRestore = async () => {
    if (restoreFile) {
      const reader = new FileReader();
      reader.onload = async (event) => {
        if (event.target?.result) {
          const data = new Uint8Array(event.target.result as ArrayBuffer);
          await restoreDB(data);
          alert("Database restored successfully. The application will now reload.");
          window.location.reload();
        }
      };
      reader.readAsArrayBuffer(restoreFile);
    }
  };

  return (
    <main>
      <h1>Settings</h1>
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
      <hr />
      <button onClick={handleBackup}>Backup Database</button>
      <hr />
      <input
        type="file"
        onChange={(e) => setRestoreFile(e.target.files?.[0] || null)}
      />
      <button onClick={handleRestore} disabled={!restoreFile}>
        Restore Database
      </button>
    </main>
  );
}
