import { render, screen, fireEvent } from "@testing-library/react";
import Settings from "./page";
import * as database from "../database";
import React from 'react';

// Mock the database module
vi.mock("../database");

// Mock the Worker
const mockPostMessage = vi.fn();
const mockTerminate = vi.fn();

class MockWorker {
  onmessage: ((this: Worker, ev: MessageEvent<any>) => any) | null = null;
  onerror: ((this: Worker, ev: ErrorEvent) => any) | null = null;
  postMessage = mockPostMessage;
  terminate = mockTerminate;
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
  });

  it("should trigger a download with the correct filename when Backup Database is clicked", () => {
    // Arrange
    const mockData = new Uint8Array([1, 2, 3]);
    (database.exportDB as vi.Mock).mockReturnValue(mockData);

    render(<Settings />);

    const anchorMock = {
      href: "",
      download: "",
      click: vi.fn(),
    } as unknown as HTMLAnchorElement;

    const createElementSpy = vi
      .spyOn(document, "createElement")
      .mockReturnValue(anchorMock);

    // Act
    const backupButton = screen.getByText("Backup Database");
    fireEvent.click(backupButton);

    // Assert
    expect(database.exportDB).toHaveBeenCalledTimes(1);
    expect(createElementSpy).toHaveBeenCalledWith("a");
    expect(anchorMock.download).toBe("audio-indexer.db");
    expect(anchorMock.click).toHaveBeenCalledTimes(1);
    expect(window.URL.revokeObjectURL).toHaveBeenCalledWith("blob:mock");

    // Cleanup
    createElementSpy.mockRestore();
  });
});
