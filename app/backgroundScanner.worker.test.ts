import { vi, describe, it, expect, beforeEach } from "vitest";

// Mock jsmediatags
vi.mock("jsmediatags", () => ({
  default: {
    read: vi.fn((file, callbacks) => {
      callbacks.onSuccess({
        tags: {
          title: "Test Title",
          artist: "Test Artist",
          album: "Test Album",
          track: "1",
        },
      });
    }),
  },
}));

describe("Background Scanner Worker", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock the global scope for the worker
    self.postMessage = vi.fn();
    // @ts-expect-error - onmessage is not in the default scope
    self.onmessage = null;
    vi.resetModules(); // This is crucial to re-run the worker script for each test
  });

  const mockDirectoryHandle = {
    // This needs to be an async generator function for `for await...of`
    [Symbol.asyncIterator]: async function* () {
      yield {
        kind: "directory" as const,
        name: "Artist 1",
        [Symbol.asyncIterator]: async function* () {
          yield {
            kind: "directory" as const,
            name: "Album 1",
            [Symbol.asyncIterator]: async function* () {
              yield {
                kind: "file" as const,
                name: "Track 1.mp3",
                getFile: () => Promise.resolve(new File([], "Track 1.mp3")),
              };
            },
            // The worker uses `dirHandle.values()`. The mock should match that structure.
            values: function () {
              return this[Symbol.asyncIterator]();
            },
          };
        },
        values: function () {
          return this[Symbol.asyncIterator]();
        },
      };
      yield {
        kind: "file" as const,
        name: "Track 2.flac",
        getFile: () => Promise.resolve(new File([], "Track 2.flac")),
      };
    },
    values: function () {
      return this[Symbol.asyncIterator]();
    },
  };

  it("should scan nested directories and find new files", async () => {
    // Import the worker script to execute its top-level code (attaching onmessage)
    await import("./backgroundScanner.worker");

    // Check that the worker has set up its message handler
    expect(self.onmessage).not.toBeNull();
    expect(self.onmessage).toBeInstanceOf(Function);

    const startMessage = {
      type: "start",
      payload: {
        directoryHandle: mockDirectoryHandle,
        knownFilePaths: new Set(),
      },
    };

    // Manually trigger the worker's onmessage. This is async but doesn't await scan().
    (self.onmessage as any)({ data: startMessage });

    // Wait until the scan is complete by polling for the "idle" message.
    await vi.waitFor(() => {
      const calls = (self.postMessage as any).mock.calls.map((c: any) => c[0]);
      const idleMessage = calls.find(
        (c: any) => c.type === "state" && c.payload === "idle"
      );
      expect(idleMessage).toBeDefined();
    });

    // Assertions
    const postMessageCalls = (self.postMessage as any).mock.calls.map(
      (c: any) => c[0]
    );

    expect(postMessageCalls).toContainEqual({
      type: "state",
      payload: "scanning",
    });

    const addedMessages = postMessageCalls.filter(
      (call: any) => call.type === "added"
    );
    expect(addedMessages.length).toBe(2);

    const addedPayloads = addedMessages.flatMap((call: any) => call.payload);

    expect(addedPayloads).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: "Artist 1/Album 1/Track 1.mp3" }),
        expect.objectContaining({ path: "Track 2.flac" }),
      ])
    );

    expect(postMessageCalls).toContainEqual({ type: "state", payload: "idle" });
  });
});
