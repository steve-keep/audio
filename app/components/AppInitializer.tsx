"use client";

import { useEffect } from 'react';
import ScanOrchestrator from './ScanOrchestrator';
import { initDB } from '../database';

// This component handles client-side initialization
export default function AppInitializer({ children }: { children: React.ReactNode }) {

  useEffect(() => {
    // Initialize the database as soon as the app loads
    initDB();
  }, []);

  return (
    <>
      <ScanOrchestrator />
      {children}
    </>
  );
}
