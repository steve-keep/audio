"use client";

import { useState, useEffect, useRef } from "react";
import {
  initDB,
  insertTrack,
  bulkInsertTracks,
  saveDbToIndexedDB,
  exportDB,
  restoreDB,
  deleteDB,
  getDirectoryHandle,
  saveDirectoryHandle,
  clearDirectoryHandle,
  getAllTrackPaths,
  deleteTrackByPath,
  getArtistCount,
} from "../database";

import { RawTrack } from "../database";

interface Track extends RawTrack {}

export default function Settings() {
  const [isApiSupported, setIsApiSupported] = useState(false);
  const [restoreFile, setRestoreFile] = useState<File | null>(null);
  const [isBackgroundScanning, setIsBackgroundScanning] = useState(false);
  const [backgroundScanStatus, setBackgroundScanStatus] = useState("Inactive");
  const [artistCount, setArtistCount] = useState(0);

  const backgroundWorkerRef = useRef<Worker | null>(null);

  useEffect(() => {
    setIsApiSupported(
      typeof window !== "undefined" && "showDirectoryPicker" in window
    );
    initDB().then(async () => {
      setArtistCount(getArtistCount());
      const existingHandle = await getDirectoryHandle();
      if (existingHandle) {
        startBackgroundScan(existingHandle);
      }
    });

    // Setup for background scanner
    backgroundWorkerRef.current = new Worker(
      new URL("../backgroundScanner.worker.ts", import.meta.url)
    );
    backgroundWorkerRef.current.onmessage = async (
      event: MessageEvent<{ type: string; payload: any }>
    ) => {
      const { type, payload } = event.data;
      if (type === "state") {
        setBackgroundScanStatus(payload);
        setIsBackgroundScanning(payload === "scanning");
      } else if (type === "added") {
        console.time("Bulk inserting tracks");
        const tracks = payload as Track[];
        bulkInsertTracks(tracks);
        await saveDbToIndexedDB();
        console.timeEnd("Bulk inserting tracks");
        setArtistCount(getArtistCount());
      } else if (type === "deleted") {
        const deletedPaths = payload as string[];
        for (const path of deletedPaths) {
          deleteTrackByPath(path);
        }
        await saveDbToIndexedDB();
        setArtistCount(getArtistCount());
      }
    };

    return () => {
      backgroundWorkerRef.current?.terminate();
    };
  }, []);

  const startBackgroundScan = (directoryHandle: FileSystemDirectoryHandle) => {
    const knownFilePaths = getAllTrackPaths();
    backgroundWorkerRef.current?.postMessage({
      type: "start",
      directoryHandle,
      knownFilePaths,
    });
  };

  const handleStartBackgroundScan = async () => {
    try {
      const directoryHandle = await window.showDirectoryPicker();
      await saveDirectoryHandle(directoryHandle);
      startBackgroundScan(directoryHandle);
    } catch (error) {
      console.error("Error selecting directory:", error);
    }
  };

  const handleStopBackgroundScan = async () => {
    await clearDirectoryHandle();
    backgroundWorkerRef.current?.postMessage({ type: "stop" });
  };

  const handleBackup = () => {
    const data = exportDB();
    if (data) {
      const blob = new Blob([new Uint8Array(data)], {
        type: "application/octet-stream",
      });
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
    <main style={{ paddingBottom: "8rem" }}>
      <h1>Settings</h1>
      <p>Artists Scanned: {artistCount}</p>
      <hr />
      <h2>Background Scanning</h2>
      {isApiSupported ? (
        <>
          <button
            onClick={handleStartBackgroundScan}
            disabled={isBackgroundScanning}
          >
            Select Directory & Start Scanning
          </button>
          <button
            onClick={handleStopBackgroundScan}
            disabled={!isBackgroundScanning}
          >
            Stop Scanning
          </button>
        </>
      ) : (
        <p>The File System Access API is not supported in your browser.</p>
      )}
      <p>Status: {backgroundScanStatus}</p>
      <hr />
      <h2>Database Management</h2>
      <button onClick={handleBackup}>Backup Database</button>
      <br />
      <br />
      <input
        type="file"
        onChange={(e) => setRestoreFile(e.target.files?.[0] || null)}
      />
      <button onClick={handleRestore} disabled={!restoreFile}>
        Restore Database
      </button>
      <hr />
      <button
        onClick={async () => {
          if (
            window.confirm("Are you sure you want to delete the database?")
          ) {
            await deleteDB();
            alert(
              "Database deleted successfully. The application will now reload."
            );
            window.location.reload();
          }
        }}
      >
        Delete Database
      </button>
      {process.env.NEXT_PUBLIC_RELEASE_VERSION && (
        <div style={{ textAlign: "center", marginTop: "2rem", color: "#888" }}>
          <p>{process.env.NEXT_PUBLIC_RELEASE_VERSION}</p>
        </div>
      )}
    </main>
  );
}
