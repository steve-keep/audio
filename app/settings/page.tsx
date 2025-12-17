"use client";

import { useState, useEffect, useRef } from "react";
import {
  initDB,
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
import { addLog, exportLogsAsText } from "../logger";

import { RawTrack } from "../database";

interface Track extends RawTrack {}

export default function Settings() {
  const [isApiSupported, setIsApiSupported] = useState(false);
  const [restoreFile, setRestoreFile] = useState<File | null>(null);
  const [isBackgroundScanning, setIsBackgroundScanning] = useState(false);
  const [backgroundScanStatus, setBackgroundScanStatus] = useState("Inactive");
  const [artistCount, setArtistCount] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);

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
      switch (type) {
        case "state":
          setBackgroundScanStatus(payload);
          setIsBackgroundScanning(payload === "scanning");
          break;
        case "log":
          addLog(payload);
          setLogs((prevLogs) => [...prevLogs, payload]);
          break;
        case "added":
          console.time("Bulk inserting tracks");
          const tracks = payload as Track[];
          bulkInsertTracks(tracks);
          await saveDbToIndexedDB();
          console.timeEnd("Bulk inserting tracks");
          setArtistCount(getArtistCount());
          break;
        case "deleted":
          const deletedPaths = payload as string[];
          for (const path of deletedPaths) {
            deleteTrackByPath(path);
          }
          await saveDbToIndexedDB();
          setArtistCount(getArtistCount());
          break;
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
      knownFilePaths: Array.from(knownFilePaths),
    });
  };

  const handleStartBackgroundScan = async () => {
    try {
      const directoryHandle = await window.showDirectoryPicker();
      await saveDirectoryHandle(directoryHandle);
      startBackgroundScan(directoryHandle);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        alert("Directory selection was cancelled.");
      } else {
        alert(`An error occurred: ${error}`);
        console.error("Error selecting directory:", error);
      }
    }
  };

  const handleStopBackgroundScan = async () => {
    await clearDirectoryHandle();
    backgroundWorkerRef.current?.postMessage({ type: "stop" });
  };

  const handleExportLogs = () => {
    const logsText = exportLogsAsText();
    const blob = new Blob([logsText], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "scan-logs.txt";
    a.click();
    URL.revokeObjectURL(url);
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
      <button onClick={handleExportLogs}>Export Logs</button>
      <div
        style={{
          height: "200px",
          overflowY: "auto",
          border: "1px solid #ccc",
          padding: "10px",
          marginTop: "10px",
        }}
      >
        {logs.map((log, index) => (
          <div key={index}>{log}</div>
        ))}
      </div>
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
