import { vi, describe, it, expect, beforeAll } from "vitest";
import jsmediatags from "jsmediatags";
import { RawTrack } from "./database";

// Mock jsmediatags for performance test
vi.mock("jsmediatags", () => ({
  default: {
    read: vi.fn((file, callbacks) => {
      callbacks.onSuccess({
        tags: {
          title: "Perf Test Title",
          artist: "Perf Test Artist",
          album: "Perf Test Album",
          track: "1",
        },
      });
    }),
  },
}));

function parseMetadata(file: File): Promise<Omit<RawTrack, 'path'>> {
  return new Promise((resolve) => {
    // We are using a mocked version of jsmediatags, so we don't need the full implementation
    jsmediatags.read(file, {
      onSuccess: (tag: any) => {
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

const NUM_ARTISTS = 10;
const NUM_ALBUMS_PER_ARTIST = 5;
const NUM_TRACKS_PER_ALBUM = 15;
const TOTAL_FILES = NUM_ARTISTS * NUM_ALBUMS_PER_ARTIST * NUM_TRACKS_PER_ALBUM;

let mockDirectoryHandle: any;

beforeAll(() => {
  const artists: any = {};
  for (let i = 0; i < NUM_ARTISTS; i++) {
    const artistName = `Artist ${i}`;
    const albums: any = {};
    for (let j = 0; j < NUM_ALBUMS_PER_ARTIST; j++) {
      const albumName = `Album ${j}`;
      const tracks: any[] = [];
      for (let k = 0; k < NUM_TRACKS_PER_ALBUM; k++) {
        tracks.push({
          kind: "file" as const,
          name: `Track ${k}.mp3`,
          getFile: () => Promise.resolve(new File([], `Track ${k}.mp3`)),
        });
      }
      albums[albumName] = {
        kind: "directory" as const,
        name: albumName,
        [Symbol.asyncIterator]: async function* () {
          for (const track of tracks) yield track;
        },
        values: function () {
          return this[Symbol.asyncIterator]();
        },
      };
    }
    artists[artistName] = {
      kind: "directory" as const,
      name: artistName,
      [Symbol.asyncIterator]: async function* () {
        for (const albumName in albums) yield albums[albumName];
      },
      values: function () {
        return this[Symbol.asyncIterator]();
      },
    };
  }

  mockDirectoryHandle = {
    [Symbol.asyncIterator]: async function* () {
      for (const artistName in artists) yield artists[artistName];
    },
    values: function () {
      return this[Symbol.asyncIterator]();
    },
  };
});

describe("Performance Benchmark", () => {
  // This is a copy of the OLD, inefficient scanning logic for comparison
  async function oldSlowScan(directoryHandle: FileSystemDirectoryHandle): Promise<RawTrack[]> {
    const tracks: RawTrack[] = [];
    async function scanDirectory(dirHandle: FileSystemDirectoryHandle, path: string) {
      for await (const entry of dirHandle.values()) {
        const entryPath = path ? `${path}/${entry.name}` : entry.name;
        if (entry.kind === "file") {
          const lowerCaseName = entry.name.toLowerCase();
          if (lowerCaseName.endsWith(".mp3") || lowerCaseName.endsWith(".flac")) {
            const file = await entry.getFile();
            const track = await parseMetadata(file);
            tracks.push({ ...track, path: entryPath });
          }
        } else if (entry.kind === "directory") {
          await scanDirectory(entry, entryPath);
        }
      }
    }
    await scanDirectory(directoryHandle, "");
    return tracks;
  }

  // This is a copy of the NEW, efficient scanning logic
  async function newFastScan(directoryHandle: FileSystemDirectoryHandle): Promise<RawTrack[]> {
    const newTracks: RawTrack[] = [];
    const promises: Promise<void>[] = [];
    async function scanDirectory(dirHandle: FileSystemDirectoryHandle, path: string) {
      for await (const entry of dirHandle.values()) {
        const entryPath = path ? `${path}/${entry.name}` : entry.name;
        if (entry.kind === "file") {
          const lowerCaseName = entry.name.toLowerCase();
          if (lowerCaseName.endsWith(".mp3") || lowerCaseName.endsWith(".flac")) {
            promises.push(
              (async () => {
                const file = await entry.getFile();
                const track = await parseMetadata(file);
                newTracks.push({ ...track, path: entryPath });
              })()
            );
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

  it(`compares scanning performance for ${TOTAL_FILES} files`, async () => {
    console.log(`\n--- Starting Performance Benchmark for ${TOTAL_FILES} files ---`);

    console.time("Old Sequential Scan");
    const oldResult = await oldSlowScan(mockDirectoryHandle);
    console.timeEnd("Old Sequential Scan");
    expect(oldResult.length).toBe(TOTAL_FILES);

    console.time("New Parallel Scan");
    const newResult = await newFastScan(mockDirectoryHandle);
    console.timeEnd("New Parallel Scan");
    expect(newResult.length).toBe(TOTAL_FILES);

    console.log("--- Benchmark Complete ---");
  }, 30000); // Increase timeout for this test
});
