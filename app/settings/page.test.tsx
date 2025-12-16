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

  it("should start background scanning when a directory is selected", async () => {
    const mockDirectoryHandle = { name: "test-dir" };
    (window.showDirectoryPicker as vi.Mock).mockResolvedValue(mockDirectoryHandle);

    await act(async () => {
      render(<Settings />);
    });

    const startButton = screen.getByText("Select Directory & Start Scanning");
    fireEvent.click(startButton);

    await act(async () => {
      await Promise.resolve();
    });

    const backgroundWorker = mockWorkerInstances.find(w => w.url.toString().includes('backgroundScanner.worker.ts'));
    expect(backgroundWorker).toBeDefined();

    act(() => {
        backgroundWorker?.onmessage?.({
            data: { type: 'state', payload: 'scanning' }
        } as MessageEvent);
    });

    await screen.findByText("Status: scanning");

    expect(database.saveDirectoryHandle).toHaveBeenCalledWith(mockDirectoryHandle);
    expect(backgroundWorker?.postMessage).toHaveBeenCalledWith({
      type: "start",
      payload: {
        directoryHandle: mockDirectoryHandle,
        knownFilePaths: new Set(),
      },
    });
  });

  it("should stop background scanning when the stop button is clicked", async () => {
    const mockDirectoryHandle = { name: "test-dir" };
    (window.showDirectoryPicker as vi.Mock).mockResolvedValue(mockDirectoryHandle);

    await act(async () => {
        render(<Settings />);
    });

    const startButton = screen.getByText("Select Directory & Start Scanning");
    const stopButton = screen.getByText("Stop Scanning");

    fireEvent.click(startButton);

    await act(async () => {
        await Promise.resolve();
    });

    const backgroundWorker = mockWorkerInstances.find(w => w.url.toString().includes('backgroundScanner.worker.ts'));
    expect(backgroundWorker).toBeDefined();

    act(() => {
        backgroundWorker?.onmessage?.({
            data: { type: 'state', payload: 'scanning' }
        } as MessageEvent);
    });
    await screen.findByText("Status: scanning");

    fireEvent.click(stopButton);

    act(() => {
        backgroundWorker?.onmessage?.({
            data: { type: 'state', payload: 'stopped' }
        } as MessageEvent);
    });
    await screen.findByText("Status: stopped");

    expect(backgroundWorker?.postMessage).toHaveBeenCalledWith({ type: "stop" });
    expect(database.clearDirectoryHandle).toHaveBeenCalled();
  });
});
