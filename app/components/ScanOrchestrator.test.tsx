import React from 'react';
import { render, act } from '@testing-library/react';
import { describe, it, vi, expect, beforeEach, afterEach } from 'vitest';
import ScanOrchestrator from './ScanOrchestrator';
import * as settings from '../settings';
import * as database from '../database';

// Mock dependencies
vi.mock('../settings');
vi.mock('../database');

// Mock the Worker class
const mockPostMessage = vi.fn();
global.Worker = class MockWorker {
  onmessage: (this: Worker, ev: MessageEvent) => any;
  constructor() {
    this.onmessage = () => {};
  }
  postMessage = mockPostMessage;
  terminate = vi.fn();
  addEventListener = vi.fn();
  removeEventListener = vi.fn();
  dispatchEvent = vi.fn();
  onerror: ((this: AbstractWorker, ev: ErrorEvent) => any) | null = null;
} as any;

describe('ScanOrchestrator', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    vi.spyOn(window, 'setTimeout');
    vi.spyOn(window, 'clearTimeout');
    vi.mocked(settings.loadSettings).mockReturnValue({
      scanMode: 'manual',
      scanIntervalHours: 1,
    });
    vi.mocked(database.getDirectoryHandle).mockResolvedValue({} as any);
    vi.mocked(database.getTrackIndex).mockReturnValue({});
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('should not schedule a scan when scanMode is "manual"', () => {
    render(<ScanOrchestrator />);
    expect(window.setTimeout).not.toHaveBeenCalled();
  });

  it('should trigger a scan immediately when scanMode is "on-launch"', () => {
    vi.mocked(settings.loadSettings).mockReturnValue({
      scanMode: 'on-launch',
      scanIntervalHours: 1,
    });
    render(<ScanOrchestrator />);
    expect(database.getDirectoryHandle).toHaveBeenCalled();
  });

  it('should schedule a periodic scan when scanMode is "periodic"', async () => {
    const intervalHours = 2;
    vi.mocked(settings.loadSettings).mockReturnValue({
      scanMode: 'periodic',
      scanIntervalHours: intervalHours,
    });

    render(<ScanOrchestrator />);

    // Check for the initial immediate scan
    expect(database.getDirectoryHandle).toHaveBeenCalledTimes(1);

    // Check that the next scan is scheduled
    expect(window.setTimeout).toHaveBeenCalledTimes(1);
    expect(window.setTimeout).toHaveBeenCalledWith(expect.any(Function), intervalHours * 60 * 60 * 1000);

    // Fast-forward time to trigger the next scan
    await act(async () => {
        vi.advanceTimersByTime(intervalHours * 60 * 60 * 1000);
    });

    // Check that another scan was triggered and the next one was scheduled
    expect(database.getDirectoryHandle).toHaveBeenCalledTimes(2);
    expect(window.setTimeout).toHaveBeenCalledTimes(2);
  });
});
