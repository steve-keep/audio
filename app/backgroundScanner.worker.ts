/// <reference lib="webworker" />

import jsmediatags from "jsmediatags";
import type { RawTrack } from "./database";

interface FileWithHandle extends File {
  handle: FileSystemFileHandle;
}

let timerId: number | null = null;
let directoryHandle: FileSystemDirectoryHandle | null = null;
let knownFilePaths = new Set<string>();

const SCAN_INTERVAL = 60 * 1000; // 1 minute

async function getFilePaths(dirHandle: FileSystemDirectoryHandle, path: string = ""): Promise<Set<string>> {
  const filePaths = new Set<string>();
  for await (const entry of dirHandle.values()) {
    const entryPath = `${path}/${entry.name}`;
    if (entry.kind === "file") {
      const lowerCaseName = entry.name.toLowerCase();
      if (lowerCaseName.endsWith(".mp3") || lowerCaseName.endsWith(".flac")) {
        filePaths.add(entryPath);
      }
    } else if (entry.kind === "directory") {
      const nestedPaths = await getFilePaths(entry, entryPath);
      nestedPaths.forEach(p => filePaths.add(p));
    }
  }
  return filePaths;
}

async function getFileByPath(dirHandle: FileSystemDirectoryHandle, path: string): Promise<File | null> {
    const pathParts = path.split("/").filter(p => p);
    let currentHandle: FileSystemDirectoryHandle | FileSystemFileHandle = dirHandle;

    for (let i = 0; i < pathParts.length; i++) {
      const part = pathParts[i];
      if (currentHandle.kind === "directory") {
        try {
          currentHandle = i === pathParts.length - 1
            ? await currentHandle.getFileHandle(part)
            : await currentHandle.getDirectoryHandle(part);
        } catch (e) {
          return null;
        }
      } else {
        return null;
      }
    }

    if (currentHandle.kind === "file") {
      return await currentHandle.getFile();
    }
    return null;
  }

async function scan() {
  if (!directoryHandle) return;

  self.postMessage({ type: "state", payload: "scanning" });

  const currentFilePaths = await getFilePaths(directoryHandle);
  const newFilePaths = [...currentFilePaths].filter(path => !knownFilePaths.has(path));
  const deletedFilePaths = [...knownFilePaths].filter(path => !currentFilePaths.has(path));

  if (newFilePaths.length > 0) {
    const newTracks: RawTrack[] = [];
    for (const path of newFilePaths) {
      const file = await getFileByPath(directoryHandle, path);
      if (file) {
        const track = await parseMetadata(file);
        newTracks.push({ ...track, path });
      }
    }
    if (newTracks.length > 0) {
      self.postMessage({ type: "added", payload: newTracks });
    }
  }

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
