"use client";

import { useState, useEffect, useRef } from "react";
import {
  initDB,
  insertTrack,
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
  const [isScanning, setIsScanning] = useState(false);
  const [scanningProgress, setScanningProgress] = useState(0);
  const [restoreFile, setRestoreFile] = useState<File | null>(null);
  const [isBackgroundScanning, setIsBackgroundScanning] = useState(false);
  const [backgroundScanStatus, setBackgroundScanStatus] = useState("Inactive");
  const [artistCount, setArtistCount] = useState(0);

  const workerRef = useRef<Worker | null>(null);
  const backgroundWorkerRef = useRef<Worker | null>(null);

  useEffect(() => {
    setIsApiSupported(
      typeof window !== "undefined" && "showDirectoryPicker" in window
    );
    initDB().then(() => {
      setArtistCount(getArtistCount());
    });

    // Setup for manual scanner
    workerRef.current = new Worker(
      new URL("../scanner.worker.ts", import.meta.url)
    );
    workerRef.current.onmessage = async (
      event: MessageEvent<{ type: string; payload: any }>
    ) => {
      if (event.data.type === "progress") {
        setScanningProgress(event.data.payload);
      } else if (event.data.type === "complete") {
        const tracks = event.data.payload as RawTrack[];
        for (const track of tracks) {
          insertTrack(track);
        }
        await saveDbToIndexedDB();
        setArtistCount(getArtistCount());
        setIsScanning(false);
      } else if (event.data.type === "error") {
        console.error(event.data.payload);
        setIsScanning(false);
      }
    };

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
        const tracks = payload as Track[];
        for (const track of tracks) {
          insertTrack(track);
        }
        await saveDbToIndexedDB();
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

    // Auto-start background scanning
    (async () => {
      const handle = await getDirectoryHandle();
      if (handle) {
        const startScanner = () => {
          const knownPaths = getAllTrackPaths();
          backgroundWorkerRef.current?.postMessage({
            type: "start",
            payload: { directoryHandle: handle, knownFilePaths: knownPaths },
          });
        };

        if ((await handle.queryPermission({ mode: "read" })) === "granted") {
          startScanner();
        } else if (
          (await handle.requestPermission({ mode: "read" })) === "granted"
        ) {
          startScanner();
        } else {
          setBackgroundScanStatus("Permission denied. Please select directory again.");
        }
      }
    })();

    return () => {
      workerRef.current?.terminate();
      backgroundWorkerRef.current?.terminate();
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

  const handleStartBackgroundScan = async () => {
    try {
      const directoryHandle = await window.showDirectoryPicker();
      await saveDirectoryHandle(directoryHandle);
      const knownPaths = getAllTrackPaths();
      backgroundWorkerRef.current?.postMessage({
        type: "start",
        payload: { directoryHandle, knownFilePaths: knownPaths },
      });
    } catch (error) {
      console.error("Error starting background scan:", error);
    }
  };

  const handleStopBackgroundScan = () => {
    backgroundWorkerRef.current?.postMessage({ type: "stop" });
    clearDirectoryHandle();
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
    <main style={{ paddingBottom: "5rem" }}>
      <h1>Settings</h1>
      <h2>Library Management</h2>
      {isApiSupported ? (
        <button onClick={handleDirectorySelection} disabled={isScanning}>
          {isScanning ? "Scanning..." : "Scan Directory"}
        </button>
      ) : (
        <p>The File System Access API is not supported in your browser.</p>
      )}
      {isScanning && <progress value={scanningProgress} max="100"></progress>}
      <hr />
      <h2>Background Scanning</h2>
      <p>
        Enable continuous background scanning to automatically detect new
        tracks. For best results, install this app as a PWA.
      </p>
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
      <p>Status: {backgroundScanStatus}</p>
      <p>Artists Scanned: {artistCount}</p>
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
