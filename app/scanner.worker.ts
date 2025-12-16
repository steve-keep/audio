// In app/scanner.worker.ts
/// <reference lib="webworker" />

import jsmediatags from "jsmediatags";

import type { RawTrack } from "./database";

self.onmessage = async (event: MessageEvent<FileSystemDirectoryHandle>) => {
  const directoryHandle = event.data;
  const tracks: RawTrack[] = [];
  const filesToProcess: { file: File, path: string }[] = [];

  try {
    const collectFiles = async (dirHandle: FileSystemDirectoryHandle, path: string = "") => {
      for await (const entry of dirHandle.values()) {
        const entryPath = `${path}/${entry.name}`;
        if (entry.kind === "file") {
          const lowerCaseName = entry.name.toLowerCase();
          if (
            lowerCaseName.endsWith(".mp3") ||
            lowerCaseName.endsWith(".flac")
          ) {
            filesToProcess.push({ file: await entry.getFile(), path: entryPath });
          }
        } else if (entry.kind === "directory") {
          await collectFiles(entry, entryPath);
        }
      }
    };

    await collectFiles(directoryHandle);

    for (let i = 0; i < filesToProcess.length; i++) {
      const { file, path } = filesToProcess[i];
      await new Promise<void>((resolve) => {
        jsmediatags.read(file, {
          onSuccess: (tag) => {
            const tags = tag.tags;
            tracks.push({
              title: tags.title || "Unknown Title",
              artist: tags.artist || "Unknown Artist",
              album: tags.album || "Unknown Album",
              track: tags.track || "0",
              path,
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
              path,
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
