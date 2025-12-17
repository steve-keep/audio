"use client";

import { useEffect, useRef } from 'react';
import { loadSettings } from '../settings';
import { getDirectoryHandle, getTrackIndex } from '../database';

// This is a non-visual component that manages scan triggers.
export default function ScanOrchestrator() {
  const scannerWorkerRef = useRef<Worker | null>(null);
  const scanTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    // Initialize the worker
    scannerWorkerRef.current = new Worker(new URL('../scanner.worker.ts', import.meta.url));

    const startScan = async () => {
        console.log("Orchestrator starting a scan...");
        const directoryHandle = await getDirectoryHandle();
        if (directoryHandle) {
            const trackIndex = getTrackIndex();
            scannerWorkerRef.current?.postMessage({
                type: 'scan',
                directoryHandle,
                trackIndex,
            });
        } else {
            console.log("ScanOrchestrator: No directory handle found. Skipping scan.");
        }
    };

    const scheduleNextScan = (intervalHours: number) => {
        if (scanTimeoutRef.current) {
            clearTimeout(scanTimeoutRef.current);
        }
        scanTimeoutRef.current = setTimeout(() => {
            startScan();
            scheduleNextScan(intervalHours); // Reschedule for the next interval
        }, intervalHours * 60 * 60 * 1000);
    };

    const settings = loadSettings();

    if (settings.scanMode === 'on-launch') {
        startScan();
    } else if (settings.scanMode === 'periodic') {
        startScan(); // Run one scan immediately, then schedule
        scheduleNextScan(settings.scanIntervalHours);
    }

    // Cleanup on component unmount
    return () => {
        scannerWorkerRef.current?.terminate();
        if (scanTimeoutRef.current) {
            clearTimeout(scanTimeoutRef.current);
        }
    };
  }, []); // Empty dependency array ensures this runs only once on mount

  // This component does not render anything
  return null;
}
