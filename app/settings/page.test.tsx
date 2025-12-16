import { render, screen, fireEvent, act } from "@testing-library/react";
import Settings from "./page";
import * as database from "../database";
import React from 'react';

// Mock the database module
vi.mock("../database");

const mockWorkerInstances: MockWorker[] = [];

class MockWorker {
  url: string | URL;
  onmessage: ((this: Worker, ev: MessageEvent<any>) => any) | null = null;
  onerror: ((this: Worker, ev: ErrorEvent) => any) | null = null;
  postMessage: vi.Mock;
  terminate: vi.Mock;

  constructor(url: string | URL) {
    this.url = url;
    this.postMessage = vi.fn();
    this.terminate = vi.fn();
    mockWorkerInstances.push(this);
  }

  addEventListener() {}
  removeEventListener() {}
  dispatchEvent() { return true; }
}

global.Worker = MockWorker as any;


describe("Settings page", () => {
  beforeEach(() => {
    window.showDirectoryPicker = vi.fn();
    window.URL.createObjectURL = vi.fn(() => "blob:mock");
    window.URL.revokeObjectURL = vi.fn();
    vi.clearAllMocks();
    mockWorkerInstances.forEach(w => w.terminate());
    mockWorkerInstances.length = 0; // Clear the array
    (database.getAllTrackPaths as vi.Mock).mockReturnValue(new Set());
    // Mock initDB to return a resolved promise
    (database.initDB as vi.Mock).mockResolvedValue(undefined);
  });

  it("should trigger a download with the correct filename when Backup Database is clicked", async () => {
    await act(async () => {
      render(<Settings />);
    });
    const mockData = new Uint8Array([1, 2, 3]);
    (database.exportDB as vi.Mock).mockReturnValue(mockData);

    const anchorMock = {
      href: "",
      download: "",
      click: vi.fn(),
    } as unknown as HTMLAnchorElement;

    const createElementSpy = vi
      .spyOn(document, "createElement")
      .mockReturnValue(anchorMock);

    const backupButton = screen.getByText("Backup Database");
    fireEvent.click(backupButton);

    expect(database.exportDB).toHaveBeenCalledTimes(1);
    expect(createElementSpy).toHaveBeenCalledWith("a");
    expect(anchorMock.download).toBe("audio-indexer.db");
    expect(anchorMock.click).toHaveBeenCalledTimes(1);
    expect(window.URL.revokeObjectURL).toHaveBeenCalledWith("blob:mock");

    createElementSpy.mockRestore();
  });

  it("should display the release version when the environment variable is set", async () => {
    const releaseVersion = "Version: 1.0.0 (Built: 2024-01-01T12:00:00Z)";
    process.env.NEXT_PUBLIC_RELEASE_VERSION = releaseVersion;

    await act(async () => {
      render(<Settings />);
    });

    const versionElement = screen.getByText(releaseVersion);
    expect(versionElement).toBeInTheDocument();

    // Clean up the environment variable after the test
    delete process.env.NEXT_PUBLIC_RELEASE_VERSION;
  });

  it("should scan a directory using the multi-worker pool", async () => {
    const mockDirectoryHandle = {
      [Symbol.asyncIterator]: async function* () {
        yield {
          kind: "directory" as const,
          name: "Artist 1",
          values: async function* () {},
        };
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
    (window.showDirectoryPicker as vi.Mock).mockResolvedValue(
      mockDirectoryHandle
    );

    await act(async () => {
      render(<Settings />);
    });

    const scanButton = screen.getByText("Scan Directory");
    await act(async () => {
      fireEvent.click(scanButton);
    });

    const subScannerWorkers = mockWorkerInstances.filter((w) =>
      w.url.toString().includes("subScanner.worker.ts")
    );
    expect(subScannerWorkers.length).toBe(2);

    // Simulate workers returning results
    await act(async () => {
      subScannerWorkers[0].onmessage?.({
        data: { type: "found", payload: [{ path: "Track 1.mp3" }] },
      } as MessageEvent);
      await Promise.resolve();
      subScannerWorkers[1].onmessage?.({
        data: { type: "found", payload: [] },
      } as MessageEvent);
      await Promise.resolve();
    });

    expect(database.bulkInsertTracks).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ path: "Track 1.mp3" }),
      ])
    );
  });
});
