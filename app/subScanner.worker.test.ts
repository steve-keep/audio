import { vi, describe, it, expect, beforeEach } from "vitest";
import { RawTrack } from "./database";

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

describe("Sub Scanner Worker", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    self.postMessage = vi.fn();
    // @ts-expect-error - onmessage is not in the default scope
    self.onmessage = null;
    vi.resetModules();
  });

  const mockDirectoryHandle = {
    [Symbol.asyncIterator]: async function* () {
      yield {
        kind: "file" as const,
        name: "Track 1.mp3",
        getFile: () => Promise.resolve(new File([], "Track 1.mp3")),
      };
    },
    values: function () {
      return this[Symbol.asyncIterator]();
    },
  };

  it("should scan a directory and return the found tracks", async () => {
    await import("./subScanner.worker");

    expect(self.onmessage).not.toBeNull();
    expect(self.onmessage).toBeInstanceOf(Function);

    const startMessage = {
      directoryHandle: mockDirectoryHandle,
      knownFilePaths: new Set(),
    };

    // Manually trigger the worker's onmessage
    (self.onmessage as any)({ data: startMessage });

    // Wait for the worker to post a message
    await vi.waitFor(() => {
      expect(self.postMessage).toHaveBeenCalled();
    });

    const postMessageCalls = (self.postMessage as any).mock.calls.map(
      (c: any) => c[0]
    );

    const foundMessage = postMessageCalls.find(
      (call: any) => call.type === "found"
    );
    expect(foundMessage).toBeDefined();
    expect(foundMessage.payload.length).toBe(1);
    expect(foundMessage.payload[0].path).toBe("Track 1.mp3");
  });
});
