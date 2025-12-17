"use client";

import Link from "next/link";
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
  getTrackIndex,
  getArtistCount,
} from "../database";
import {
  loadSettings,
  saveSettings,
  AppSettings,
  ScanMode,
  ScanInterval,
} from "../settings";
import { addLog, exportLogsAsText } from "../logger";

export default function Settings() {
  const [isApiSupported, setIsApiSupported] = useState(false);
  const [artistCount, setArtistCount] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);
  const [restoreFile, setRestoreFile] = useState<File | null>(null);

  // New state for settings and scanning
  const [settings, setSettings] = useState<AppSettings>({ scanMode: 'on-launch', scanIntervalHours: 6 });
  const [scanStatus, setScanStatus] = useState("Idle");
  const [scanStats, setScanStats] = useState({ total: 0, new: 0, modified: 0, unchanged: 0, processed: 0 });
  const [isScanning, setIsScanning] = useState(false);
  const scannerWorkerRef = useRef<Worker | null>(null);

  useEffect(() => {
    setIsApiSupported(typeof window !== "undefined" && "showDirectoryPicker" in window);
    const loadedSettings = loadSettings();
    setSettings(loadedSettings);

    initDB().then(() => {
      setArtistCount(getArtistCount());
    });

    // Setup for the new scanner worker
    scannerWorkerRef.current = new Worker(
      new URL("../scanner.worker.ts", import.meta.url)
    );

    scannerWorkerRef.current.onmessage = async (event: MessageEvent) => {
      const { type, message, stats, tracks, processed, total } = event.data;
      switch (type) {
        case 'status':
          setScanStatus(message);
          addLog(`Status: ${message}`);
          setLogs(prev => [...prev, `Status: ${message}`]);
          break;
        case 'scan-progress':
          setScanStats(prev => ({ ...prev, ...stats }));
          break;
        case 'parse-progress':
          setScanStats(prev => ({ ...prev, processed: processed, total: total }));
          break;
        case 'tracks-added':
          console.time("Bulk inserting tracks batch");
          bulkInsertTracks(tracks);
          await saveDbToIndexedDB();
          console.timeEnd("Bulk inserting tracks batch");
          setArtistCount(getArtistCount());
          break;
        case 'scan-complete':
          setIsScanning(false);
          setScanStatus("Scan complete.");
          setScanStats(prev => ({ ...prev, ...stats }));
          addLog(`Scan complete: ${JSON.stringify(stats)}`);
          setLogs(prev => [...prev, `Scan complete: ${JSON.stringify(stats)}`]);
          break;
      }
    };

    return () => {
      scannerWorkerRef.current?.terminate();
    };
  }, []);

  const handleSettingsChange = (newSettings: Partial<AppSettings>) => {
    const updatedSettings = { ...settings, ...newSettings };
    setSettings(updatedSettings);
    saveSettings(updatedSettings);
  };

  const handleStartScan = async () => {
    setIsScanning(true);
    setScanStatus("Initializing scan...");
    setScanStats({ total: 0, new: 0, modified: 0, unchanged: 0, processed: 0 });
    try {
      let directoryHandle = await getDirectoryHandle();
      if (!directoryHandle) {
        directoryHandle = await window.showDirectoryPicker();
        await saveDirectoryHandle(directoryHandle);
      }
      const trackIndex = getTrackIndex();
      scannerWorkerRef.current?.postMessage({
        type: 'scan',
        directoryHandle,
        trackIndex,
      });
    } catch (error) {
      setIsScanning(false);
      if (error instanceof DOMException && error.name === "AbortError") {
        setScanStatus("Directory selection cancelled.");
      } else {
        setScanStatus("An error occurred during scan initiation.");
        console.error("Error starting scan:", error);
      }
    }
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
          alert("Database restored. The application will reload.");
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
      <h2>File Scanning</h2>
      {isApiSupported ? (
        <>
          <button onClick={handleStartScan} disabled={isScanning}>
            {isScanning ? 'Scanning...' : 'Manual Scan'}
          </button>
          <div style={{ marginTop: '1rem' }}>
            <h4>Scan Options</h4>
            <div>
              <input
                type="radio"
                id="manual"
                name="scanMode"
                value="manual"
                checked={settings.scanMode === 'manual'}
                onChange={() => handleSettingsChange({ scanMode: 'manual' })}
              />
              <label htmlFor="manual"> Manual scan only</label>
            </div>
            <div>
              <input
                type="radio"
                id="on-launch"
                name="scanMode"
                value="on-launch"
                checked={settings.scanMode === 'on-launch'}
                onChange={() => handleSettingsChange({ scanMode: 'on-launch' })}
              />
              <label htmlFor="on-launch"> Scan on application launch</label>
            </div>
            <div>
              <input
                type="radio"
                id="periodic"
                name="scanMode"
                value="periodic"
                checked={settings.scanMode === 'periodic'}
                onChange={() => handleSettingsChange({ scanMode: 'periodic' })}
              />
              <label htmlFor="periodic"> Scan periodically</label>
              {settings.scanMode === 'periodic' && (
                <select
                  value={settings.scanIntervalHours}
                  onChange={(e) => handleSettingsChange({ scanIntervalHours: parseInt(e.target.value, 10) as ScanInterval })}
                  style={{ marginLeft: '10px' }}
                >
                  <option value={1}>Every 1 hour</option>
                  <option value={6}>Every 6 hours</option>
                  <option value={24}>Every 24 hours</option>
                </select>
              )}
            </div>
          </div>
          <h4>Scan Status</h4>
          <p>{scanStatus}</p>
          {isScanning && (
            <div>
              <p>Total Files: {scanStats.total} | New: {scanStats.new} | Modified: {scanStats.modified} | Unchanged: {scanStats.unchanged}</p>
              <p>Metadata Parsing: {scanStats.processed} / {scanStats.total - scanStats.unchanged}</p>
            </div>
          )}
        </>
      ) : (
        <p>The File System Access API is not supported in your browser.</p>
      )}
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
            alert("Database deleted. The application will reload.");
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
