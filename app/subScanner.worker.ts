/// <reference lib="webworker" />

import jsmediatags from "jsmediatags";
import type { RawTrack } from "./database";

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

async function scan(
  directoryHandle: FileSystemDirectoryHandle,
  knownFilePaths: Set<string>
): Promise<RawTrack[]> {
  const newTracks: RawTrack[] = [];
  const promises: Promise<void>[] = [];

  async function scanDirectory(dirHandle: FileSystemDirectoryHandle, path: string) {
    for await (const entry of dirHandle.values()) {
      const entryPath = path ? `${path}/${entry.name}` : entry.name;

      if (entry.kind === "file") {
        const lowerCaseName = entry.name.toLowerCase();
        if (lowerCaseName.endsWith(".mp3") || lowerCaseName.endsWith(".flac")) {
          if (!knownFilePaths.has(entryPath)) {
            promises.push(
              (async () => {
                try {
                  const file = await entry.getFile();
                  const track = await parseMetadata(file);
                  newTracks.push({ ...track, path: entryPath });
                } catch (error) {
                  console.error(`Error processing file ${entryPath}:`, error);
                }
              })()
            );
          }
        }
      } else if (entry.kind === "directory") {
        await scanDirectory(entry, entryPath);
      }
    }
  }

  await scanDirectory(directoryHandle, "");
  await Promise.all(promises);
  return newTracks;
}

self.onmessage = async (
  event: MessageEvent<{
    directoryHandle: FileSystemDirectoryHandle;
    knownFilePaths: Set<string>;
  }>
) => {
  const { directoryHandle, knownFilePaths } = event.data;
  const newTracks = await scan(directoryHandle, knownFilePaths);
  self.postMessage({ type: "found", payload: newTracks });
};
