/// <reference lib="webworker" />

import jsmediatags from "jsmediatags";
import type { RawTrack } from "./database";

interface Track extends RawTrack {
  path: string;
}

let timerId: number | null = null;
let directoryHandle: FileSystemDirectoryHandle | null = null;
let knownFilePaths = new Set<string>();

const SCAN_INTERVAL = 60 * 1000; // 1 minute

function log(message: string) {
  self.postMessage({ type: "log", payload: message });
}

async function scan() {
  if (!directoryHandle) return;

  log("Starting scan...");
  self.postMessage({ type: "state", payload: "scanning" });

  const currentFilePaths = new Set<string>();
  const newTracks: Track[] = [];

  async function scanDirectory(
    dirHandle: FileSystemDirectoryHandle,
    path: string
  ) {
    for await (const entry of dirHandle.values()) {
      const entryPath = path ? `${path}/${entry.name}` : entry.name;

      if (entry.kind === "file") {
        const lowerCaseName = entry.name.toLowerCase();
        if (
          lowerCaseName.endsWith(".mp3") ||
          lowerCaseName.endsWith(".flac")
        ) {
          currentFilePaths.add(entryPath);

          if (!knownFilePaths.has(entryPath)) {
            try {
              const file = await entry.getFile();
              const track = await parseMetadata(file);
              newTracks.push({ ...track, path: entryPath });
            } catch (error) {
              log(`Error processing file ${entryPath}: ${error}`);
              console.error(`Error processing file ${entryPath}:`, error);
            }
          }
        }
      } else if (entry.kind === "directory") {
        await scanDirectory(entry, entryPath);
      }
    }
  }

  await scanDirectory(directoryHandle, "");

  if (newTracks.length > 0) {
    log(`Found ${newTracks.length} new tracks.`);
    self.postMessage({ type: "added", payload: newTracks });
  }

  const deletedFilePaths = [...knownFilePaths].filter(
    (path) => !currentFilePaths.has(path)
  );

  if (deletedFilePaths.length > 0) {
    log(`Found ${deletedFilePaths.length} deleted tracks.`);
    self.postMessage({ type: "deleted", payload: deletedFilePaths });
  }

  knownFilePaths = currentFilePaths;
  log("Scan complete.");
  self.postMessage({ type: "state", payload: "idle" });
}

function parseMetadata(file: File): Promise<Omit<RawTrack, "path">> {
  return new Promise((resolve, reject) => {
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
        log(`jsmediatags error for ${file.name}: ${error.type} - ${error.info}`);
        reject(error);
      },
    });
  });
}

self.onmessage = async (
  event: MessageEvent<{
    type: string;
    directoryHandle?: FileSystemDirectoryHandle;
    knownFilePaths?: string[];
  }>
) => {
  const { type, directoryHandle: dirHandle, knownFilePaths: paths } = event.data;

  if (type === "start" && dirHandle && paths) {
    directoryHandle = dirHandle;
    knownFilePaths = new Set(paths);
    if (timerId) clearInterval(timerId);
    log("Background scanner started.");
    timerId = self.setInterval(scan, SCAN_INTERVAL);
    scan(); // Scan immediately on start
  } else if (type === "stop") {
    if (timerId) {
      clearInterval(timerId);
      timerId = null;
    }
    directoryHandle = null;
    knownFilePaths.clear();
    log("Background scanner stopped.");
    self.postMessage({ type: "state", payload: "stopped" });
  }
};
