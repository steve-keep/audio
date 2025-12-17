"use client";

import { useState } from 'react';
import styles from './page.module.css';

export default function ScanTestPage() {
  const [files, setFiles] = useState<string[]>([]);
  const [isScanning, setIsScanning] = useState(false);

  const handleDirectorySelection = async () => {
    try {
      const directoryHandle = await window.showDirectoryPicker();
      setFiles([]); // Clear previous results
      setIsScanning(true);

      const processDirectory = async (dirHandle: FileSystemDirectoryHandle, path: string) => {
        for await (const entry of dirHandle.values()) {
          const newPath = path ? `${path}/${entry.name}` : entry.name;
          if (entry.kind === 'file') {
            setFiles(prevFiles => [...prevFiles, newPath]);
          } else if (entry.kind === 'directory') {
            await processDirectory(entry, newPath);
          }
        }
      };

      await processDirectory(directoryHandle, '');
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        console.log('Directory selection was canceled.');
      } else {
        console.error('Error scanning directory:', error);
      }
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <div className={styles.container}>
      <h1>Directory Scan Test</h1>
      <p>
        This is a diagnostic tool to test the performance of recursively scanning a directory for files.
      </p>
      <button onClick={handleDirectorySelection} disabled={isScanning}>
        {isScanning ? 'Scanning...' : 'Select Directory'}
      </button>

      <h2>Found Files:</h2>
      <ul className={styles.fileList}>
        {files.map((file) => (
          <li key={file}>{file}</li>
        ))}
      </ul>
    </div>
  );
}
