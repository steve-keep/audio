import { render, screen, fireEvent, act, waitFor } from "@testing-library/react";
import Settings from "./page";
import * as database from "../database";
import React from "react";

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
  dispatchEvent() {
    return true;
  }
}

global.Worker = MockWorker as any;

describe("Settings page background scanning", () => {
  let backgroundWorker: MockWorker | undefined;

  beforeEach(async () => {
    window.showDirectoryPicker = vi.fn();
    vi.clearAllMocks();
    mockWorkerInstances.length = 0; // Clear the array before each test

    // Mock database functions
    (database.initDB as vi.Mock).mockResolvedValue(undefined);
    (database.getDirectoryHandle as vi.Mock).mockResolvedValue(null);
    (database.saveDirectoryHandle as vi.Mock).mockResolvedValue(undefined);
    (database.clearDirectoryHandle as vi.Mock).mockResolvedValue(undefined);
    (database.getAllTrackPaths as vi.Mock).mockReturnValue(new Set());
    (database.getArtistCount as vi.Mock).mockReturnValue(0);
  });

  it("should start background scanning when a directory is selected", async () => {
    await act(async () => {
      render(<Settings />);
    });
    backgroundWorker = mockWorkerInstances.find((w) =>
      w.url.toString().includes("backgroundScanner.worker.ts")
    );
    const mockDirectoryHandle = { name: "mockDir" };
    (window.showDirectoryPicker as vi.Mock).mockResolvedValue(
      mockDirectoryHandle
    );

    const startButton = screen.getByText("Select Directory & Start Scanning");
    await act(async () => {
      fireEvent.click(startButton);
    });

    await waitFor(() => {
        expect(window.showDirectoryPicker).toHaveBeenCalledTimes(1);
    });

    await waitFor(() => {
        expect(database.saveDirectoryHandle).toHaveBeenCalledWith(mockDirectoryHandle);
    });

    await waitFor(() => {
        expect(backgroundWorker?.postMessage).toHaveBeenCalledWith({
          type: "start",
          directoryHandle: mockDirectoryHandle,
          knownFilePaths: [],
        });
    });
  });

  it("should stop background scanning when the stop button is clicked", async () => {
    await act(async () => {
      render(<Settings />);
    });
    backgroundWorker = mockWorkerInstances.find((w) =>
      w.url.toString().includes("backgroundScanner.worker.ts")
    );
    // First, simulate that scanning is active
    act(() => {
      backgroundWorker?.onmessage?.({
        data: { type: "state", payload: "scanning" },
      } as MessageEvent);
    });

    const stopButton = await screen.findByText("Stop Scanning");
    expect(stopButton).not.toBeDisabled();

    await act(async () => {
      fireEvent.click(stopButton);
    });

    await waitFor(() => {
        expect(database.clearDirectoryHandle).toHaveBeenCalledTimes(1);
    });

    await waitFor(() => {
        expect(backgroundWorker?.postMessage).toHaveBeenCalledWith({ type: "stop" });
    });
  });

  it("should automatically start scanning if a directory handle exists", async () => {
    const mockDirectoryHandle = { name: "existingMockDir" };
    (database.getDirectoryHandle as vi.Mock).mockResolvedValue(mockDirectoryHandle);

    // Re-render the component to trigger the useEffect with the new mock value
    await act(async () => {
      render(<Settings />);
    });

    backgroundWorker = mockWorkerInstances.find(w => w.url.toString().includes('backgroundScanner.worker.ts'));

    await waitFor(() => {
        expect(database.getDirectoryHandle).toHaveBeenCalledTimes(1);
    });

    await waitFor(() => {
        expect(backgroundWorker?.postMessage).toHaveBeenCalledWith({
            type: 'start',
            directoryHandle: mockDirectoryHandle,
            knownFilePaths: [],
        });
    });
  });
});