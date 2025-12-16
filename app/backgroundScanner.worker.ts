/// <reference lib="webworker" />

import jsmediatags from "jsmediatags";
import type { RawTrack } from "./database";

let timerId: number | null = null;
let directoryHandle: FileSystemDirectoryHandle | null = null;
let knownFilePaths = new Set<string>();

const SCAN_INTERVAL = 60 * 1000; // 1 minute

async function scan() {
  if (!directoryHandle) return;

  self.postMessage({ type: "state", payload: "scanning" });

  const currentFilePaths = new Set<string>();

  async function scanDirectory(dirHandle: FileSystemDirectoryHandle, path: string) {
    for await (const entry of dirHandle.values()) {
      const entryPath = path ? `${path}/${entry.name}` : entry.name;

      if (entry.kind === "file") {
        const lowerCaseName = entry.name.toLowerCase();
        if (lowerCaseName.endsWith(".mp3") || lowerCaseName.endsWith(".flac")) {
          currentFilePaths.add(entryPath);

          if (!knownFilePaths.has(entryPath)) {
            try {
              const file = await entry.getFile();
              const track = await parseMetadata(file);
              self.postMessage({ type: "added", payload: [{ ...track, path: entryPath }] });
            } catch (error) {
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

  const deletedFilePaths = [...knownFilePaths].filter(path => !currentFilePaths.has(path));

  if (deletedFilePaths.length > 0) {
    self.postMessage({ type: "deleted", payload: deletedFilePaths });
  }

  knownFilePaths = currentFilePaths;
  self.postMessage({ type: "state", payload: "idle" });
}

function parseMetadata(file: File): Promise<Omit<RawTrack, 'path'>> {
  return new Promise((resolve) => {
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
      onError: () => {
        resolve({
          title: file.name,
          artist: "Unknown Artist",
          album: "Unknown Album",
          track: "0",
        });
      },
    });
  });
}

self.onmessage = async (event: MessageEvent<{ type: string; payload: any }>) => {
  if (event.data.type === "start") {
    directoryHandle = event.data.payload.directoryHandle;
    knownFilePaths = event.data.payload.knownFilePaths;
    if (timerId) clearInterval(timerId);
    timerId = self.setInterval(scan, SCAN_INTERVAL);
    scan(); // Scan immediately on start
  } else if (event.data.type === "stop") {
    if (timerId) {
      clearInterval(timerId);
      timerId = null;
    }
    directoryHandle = null;
    knownFilePaths.clear();
    self.postMessage({ type: "state", payload: "stopped" });
  }
};
