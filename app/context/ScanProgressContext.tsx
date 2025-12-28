"use client";

import React, { createContext, useContext, useState, ReactNode } from 'react';

type ScanStatus = 'idle' | 'running' | 'success' | 'error';

interface ScanProgressState {
  status: ScanStatus;
  found: number;
  processed: number;
  setStatus: (status: ScanStatus) => void;
  setFound: (count: number) => void;
  setProcessed: (count: number) => void;
  reset: () => void;
}

const ScanProgressContext = createContext<ScanProgressState | undefined>(undefined);

export const ScanProgressProvider = ({ children }: { children: ReactNode }) => {
  const [status, setStatus] = useState<ScanStatus>('idle');
  const [found, setFound] = useState(0);
  const [processed, setProcessed] = useState(0);

  const reset = () => {
    setStatus('idle');
    setFound(0);
    setProcessed(0);
  };

  return (
    <ScanProgressContext.Provider value={{ status, found, processed, setStatus, setFound, setProcessed, reset }}>
      {children}
    </ScanProgressContext.Provider>
  );
};

export const useScanProgress = () => {
  const context = useContext(ScanProgressContext);
  if (context === undefined) {
    throw new Error('useScanProgress must be used within a ScanProgressProvider');
  }
  return context;
};
