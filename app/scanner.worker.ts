
import jsmediatags from "jsmediatags";
import { RawTrack, TrackIndex } from "./database";

// Define message types for communication between the main thread and the worker
interface ScanMessage {
  type: 'scan';
  directoryHandle: FileSystemDirectoryHandle;
  trackIndex: TrackIndex;
}

// --- Utility Functions ---

// Helper to read metadata using jsmediatags wrapped in a Promise
function readMediaTags(file: File): Promise<RawTrack> {
  return new Promise((resolve, reject) => {
    jsmediatags.read(file, {
      onSuccess: (tag) => {
        const tags = tag.tags;
        // Construct a partial RawTrack, filling in missing details later
        const rawTrack: Partial<RawTrack> = {
          title: tags.title || file.name.replace(/\.[^/.]+$/, ""),
          artist: tags.artist || 'Unknown Artist',
          album: tags.album || 'Unknown Album',
          track: tags.track || '0',
          path: (file as any).path, // The 'path' property is added during traversal
          lastModified: file.lastModified,
          size: file.size,
        };
        resolve(rawTrack as RawTrack);
      },
      onError: (error) => {
        // On error, create a track with placeholder data based on the file
        console.warn(`Could not parse metadata for ${file.name}:`, error);
        const rawTrack: Partial<RawTrack> = {
            title: file.name.replace(/\.[^/.]+$/, ""),
            artist: 'Unknown Artist',
            album: 'Unknown Album',
            track: '0',
            path: (file as any).path,
            lastModified: file.lastModified,
            size: file.size,
        };
        resolve(rawTrack as RawTrack);
      },
    });
  });
}

// Recursive async generator to traverse the directory structure
async function* traverseDirectory(
  directoryHandle: FileSystemDirectoryHandle,
  currentPath = ''
): AsyncGenerator<{ file: File, path: string }> {
  for await (const entry of directoryHandle.values()) {
    const newPath = currentPath ? `${currentPath}/${entry.name}` : entry.name;
    if (entry.kind === 'file' && (entry.name.endsWith('.mp3') || entry.name.endsWith('.m4a') || entry.name.endsWith('.flac'))) {
        const file = await entry.getFile();
        // Attach the full path to the file object for later reference
        Object.defineProperty(file, 'path', { value: newPath, writable: false });
        yield { file, path: newPath };
    } else if (entry.kind === 'directory') {
      yield* traverseDirectory(entry, newPath);
    }
  }
}

// --- Main Worker Logic ---

self.onmessage = async (e: MessageEvent<ScanMessage>) => {
  if (e.data.type === 'scan') {
    const { directoryHandle, trackIndex } = e.data;
    const filesToProcess: File[] = [];
    let stats = { total: 0, new: 0, modified: 0, unchanged: 0 };

    postMessage({ type: 'status', message: 'Scanning for new or modified files...' });

    // 1. Scan the directory and identify files that need processing
    for await (const { file, path } of traverseDirectory(directoryHandle)) {
      stats.total++;
      const existingTrack = trackIndex[path];
      if (!existingTrack) {
        stats.new++;
        filesToProcess.push(file);
      } else if (existingTrack.lastModified !== file.lastModified || existingTrack.size !== file.size) {
        stats.modified++;
        filesToProcess.push(file); // Treat as new for simplicity of processing
      } else {
        stats.unchanged++;
      }
      if (stats.total % 100 === 0) {
        postMessage({ type: 'scan-progress', stats });
      }
    }
    postMessage({ type: 'scan-progress', stats }); // Final scan progress

    // 2. Process the identified files in batches
    postMessage({ type: 'status', message: `Parsing metadata for ${filesToProcess.length} files...` });
    const batchSize = 50;
    let processedCount = 0;
    const newTracks: RawTrack[] = [];

    for (const file of filesToProcess) {
      try {
        const track = await readMediaTags(file);
        newTracks.push(track);

        if (newTracks.length >= batchSize) {
          postMessage({ type: 'tracks-added', tracks: [...newTracks] });
          newTracks.length = 0; // Clear the batch
        }
      } catch (error) {
        console.error(`Failed to process file: ${(file as any).path}`, error);
      }
      processedCount++;
      if (processedCount % 10 === 0) {
        postMessage({ type: 'parse-progress', processed: processedCount, total: filesToProcess.length });
      }
    }

    // Send any remaining tracks in the last batch
    if (newTracks.length > 0) {
      postMessage({ type: 'tracks-added', tracks: newTracks });
    }

    postMessage({ type: 'parse-progress', processed: processedCount, total: filesToProcess.length }); // Final parse progress
    postMessage({ type: 'scan-complete', stats });
  }
};
