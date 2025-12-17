
import { describe, it, expect, vi, beforeEach } from 'vitest';
import jsmediatags from 'jsmediatags';

// Mock the global self object for the worker environment
const self = {
  postMessage: vi.fn(),
  onmessage: null as ((e: MessageEvent) => void) | null,
};
// In the JSDOM test environment, the global `postMessage` is `window.postMessage`, which has a different signature.
// We must explicitly mock the global `postMessage` to align with the Web Worker API for our tests.
global.self = self as any;
(global as any).postMessage = self.postMessage;


// Dynamically import the worker script to attach the onmessage handler
await import('./scanner.worker.ts');

// Mock the dependencies
vi.mock('jsmediatags', () => ({
  default: {
    read: vi.fn((file, callbacks) => {
      callbacks.onSuccess({
        tags: {
          title: file.name.replace(/\.[^/.]+$/, ''),
          artist: 'Mock Artist',
          album: 'Mock Album',
          track: '1',
        },
      });
    }),
  },
}));


describe('Scanner Worker', () => {

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Helper to create a mock FileSystemDirectoryHandle
  const createMockDirectoryHandle = (entries: any[]): FileSystemDirectoryHandle => {
    return {
      values: () => ({
        async *[Symbol.asyncIterator]() {
          for (const entry of entries) {
            yield entry;
          }
        },
      }),
    } as any;
  };

  // Helper to create a mock FileSystemFileHandle for a file
  const createMockFile = (name: string, lastModified: number, size: number) => ({
    kind: 'file',
    name,
    getFile: async () => ({
      name,
      lastModified,
      size,
      type: 'audio/mpeg',
    }),
  });

  // Helper to create a mock FileSystemDirectoryHandle for a directory
    const createMockDirectory = (name: string, files: any[]) => ({
        kind: 'directory',
        name,
        values: () => ({
            async *[Symbol.asyncIterator]() {
                for (const file of files) {
                    yield file;
                }
            },
        }),
    });

  it('should identify new files and process them', async () => {
    const files = [
      createMockFile('track1.mp3', 1000, 1024),
      createMockFile('track2.mp3', 2000, 2048),
    ];
    const directoryHandle = createMockDirectoryHandle(files);
    const trackIndex = {};

    const message = { data: { type: 'scan', directoryHandle, trackIndex } } as MessageEvent;
    await self.onmessage!(message);

    // Check status updates
    expect(self.postMessage).toHaveBeenCalledWith({ type: 'status', message: 'Scanning for new or modified files...' });
    expect(self.postMessage).toHaveBeenCalledWith({ type: 'status', message: 'Parsing metadata for 2 files...' });

    // Check final stats
    const expectedStats = { total: 2, new: 2, modified: 0, unchanged: 0 };
    expect(self.postMessage).toHaveBeenCalledWith({ type: 'scan-progress', stats: expectedStats });

    // Check that tracks were added
    expect(self.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'tracks-added' })
    );

    // Check completion message
    expect(self.postMessage).toHaveBeenCalledWith({ type: 'scan-complete', stats: expectedStats });
  });

  it('should correctly identify new, modified, and unchanged files', async () => {
    const files = [
      createMockFile('new_track.mp3', 1000, 1024), // New
      createMockFile('modified_track.mp3', 3000, 3072), // Modified
      createMockFile('unchanged_track.mp3', 4000, 4096), // Unchanged
    ];
    const directoryHandle = createMockDirectoryHandle(files);
    const trackIndex = {
      'modified_track.mp3': { lastModified: 2500, size: 3072 }, // different lastModified
      'unchanged_track.mp3': { lastModified: 4000, size: 4096 }, // same
    };

    const message = { data: { type: 'scan', directoryHandle, trackIndex } } as MessageEvent;
    await self.onmessage!(message);

    const expectedStats = { total: 3, new: 1, modified: 1, unchanged: 1 };
    expect(self.postMessage).toHaveBeenCalledWith({ type: 'scan-progress', stats: expectedStats });

    // Should parse 2 files (new + modified)
    expect(self.postMessage).toHaveBeenCalledWith({ type: 'status', message: 'Parsing metadata for 2 files...' });

    // The 'tracks-added' payload should contain 2 tracks
    const tracksAddedCall = vi.mocked(self.postMessage).mock.calls.find(call => call[0].type === 'tracks-added');
    expect(tracksAddedCall[0].tracks).toHaveLength(2);
    expect(tracksAddedCall[0].tracks.map((t:any) => t.path)).toEqual(['new_track.mp3', 'modified_track.mp3']);

    expect(self.postMessage).toHaveBeenCalledWith({ type: 'scan-complete', stats: expectedStats });
  });

  it('should not process any files if none have changed', async () => {
    const files = [
      createMockFile('track1.mp3', 1000, 1024),
    ];
    const directoryHandle = createMockDirectoryHandle(files);
    const trackIndex = {
      'track1.mp3': { lastModified: 1000, size: 1024 },
    };

    const message = { data: { type: 'scan', directoryHandle, trackIndex } } as MessageEvent;
    await self.onmessage!(message);

    const expectedStats = { total: 1, new: 0, modified: 0, unchanged: 1 };
    expect(self.postMessage).toHaveBeenCalledWith({ type: 'scan-progress', stats: expectedStats });

    // Should not try to parse any files
    expect(self.postMessage).toHaveBeenCalledWith({ type: 'status', message: 'Parsing metadata for 0 files...' });

    // Should not add any tracks
    expect(self.postMessage).not.toHaveBeenCalledWith(expect.objectContaining({ type: 'tracks-added' }));

    expect(self.postMessage).toHaveBeenCalledWith({ type: 'scan-complete', stats: expectedStats });
  });

  it('should handle nested directories', async () => {
    const nestedFiles = [
        createMockFile('nested_track.mp3', 5000, 5120),
    ];
    const topLevelFiles = [
        createMockFile('top_level.mp3', 6000, 6144),
        createMockDirectory('Nested', nestedFiles)
    ];
    const directoryHandle = createMockDirectoryHandle(topLevelFiles);
    const trackIndex = {};

    const message = { data: { type: 'scan', directoryHandle, trackIndex } } as MessageEvent;
    await self.onmessage!(message);

    const expectedStats = { total: 2, new: 2, modified: 0, unchanged: 0 };
    expect(self.postMessage).toHaveBeenCalledWith({ type: 'scan-progress', stats: expectedStats });

    // Check that paths are correctly constructed
    const tracksAddedCall = vi.mocked(self.postMessage).mock.calls.find(call => call[0].type === 'tracks-added');
    expect(tracksAddedCall[0].tracks.map((t:any) => t.path).sort()).toEqual(['Nested/nested_track.mp3', 'top_level.mp3']);
  });
});
