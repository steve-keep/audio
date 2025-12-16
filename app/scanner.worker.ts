// In app/scanner.worker.ts
/// <reference lib="webworker" />

import jsmediatags from "jsmediatags";

import type { RawTrack } from "./database";

self.onmessage = async (event: MessageEvent<FileSystemDirectoryHandle>) => {
  const directoryHandle = event.data;
  const tracks: RawTrack[] = [];
  const filesToProcess: File[] = [];

  try {
    const collectFiles = async (dirHandle: FileSystemDirectoryHandle) => {
      for await (const entry of dirHandle.values()) {
        if (entry.kind === "file") {
          const lowerCaseName = entry.name.toLowerCase();
          if (
            lowerCaseName.endsWith(".mp3") ||
            lowerCaseName.endsWith(".flac")
          ) {
            filesToProcess.push(await entry.getFile());
          }
        } else if (entry.kind === "directory") {
          await collectFiles(entry);
        }
      }
    };

    await collectFiles(directoryHandle);

    for (let i = 0; i < filesToProcess.length; i++) {
      const file = filesToProcess[i];
      await new Promise<void>((resolve) => {
        jsmediatags.read(file, {
          onSuccess: (tag) => {
            const tags = tag.tags;
            tracks.push({
              title: tags.title || "Unknown Title",
              artist: tags.artist || "Unknown Artist",
              album: tags.album || "Unknown Album",
              track: tags.track || "0",
            });
            resolve();
          },
          onError: (error) => {
            console.error(error);
            tracks.push({
              title: file.name,
              artist: "Unknown Artist",
              album: "Unknown Album",
              track: "0",
            });
            resolve();
          },
        });
      });
      self.postMessage({
        type: "progress",
        payload: ((i + 1) / filesToProcess.length) * 100,
      });
    }

    self.postMessage({ type: "complete", payload: tracks });
  } catch (error) {
    self.postMessage({ type: "error", payload: "Error scanning directory" });
  }
};
