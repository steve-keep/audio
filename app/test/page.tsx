"use client";

import { useState, useEffect } from 'react';
import styles from './TestPage.module.css';
import jsmediatags from 'jsmediatags';
import * as mm from 'music-metadata-browser';

// Extend the Window interface to include the taglibWasm object
declare global {
  interface Window {
    taglibWasm: any;
  }
}

interface Result {
  library: string;
  filesProcessed: number;
  timeTaken: number;
}

const SUPPORTED_EXTENSIONS = ['.mp3', '.flac', '.m4a'];

const TestPage = () => {
  const [results, setResults] = useState<Result[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [directory, setDirectory] = useState<FileSystemDirectoryHandle | null>(null);
  const [status, setStatus] = useState('');
  const [isTaglibScriptLoaded, setIsTaglibScriptLoaded] = useState(false);

  useEffect(() => {
    // Check if the script is already loaded
    if (window.taglibWasm) {
      setIsTaglibScriptLoaded(true);
      return;
    }

    const script = document.createElement('script');
    script.src = '/audio/vendor/taglib-wasm/lib-via-script-tag.js';
    script.async = true;
    script.onload = () => setIsTaglibScriptLoaded(true);
    script.onerror = () => console.error('Failed to load the taglib-wasm script.');
    document.body.appendChild(script);

    return () => {
      // Clean up the script tag if the component unmounts
      document.body.removeChild(script);
    };
  }, []);

  const handleDirectorySelection = async () => {
    try {
      const directoryHandle = await window.showDirectoryPicker();
      setDirectory(directoryHandle);
      setResults([]);
      setStatus(`Selected directory: ${directoryHandle.name}`);
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        console.log('Directory selection was canceled.');
      } else {
        console.error('Error selecting directory:', error);
      }
    }
  };

  const getAllFiles = async (dirHandle: FileSystemDirectoryHandle): Promise<FileSystemFileHandle[]> => {
    const files: FileSystemFileHandle[] = [];
    const processDirectory = async (currentDirHandle: FileSystemDirectoryHandle) => {
      for await (const entry of currentDirHandle.values()) {
        if (entry.kind === 'file') {
          const isSupported = SUPPORTED_EXTENSIONS.some(ext => entry.name.toLowerCase().endsWith(ext));
          if (isSupported) {
            files.push(entry);
          }
        } else if (entry.kind === 'directory') {
          await processDirectory(entry);
        }
      }
    };
    await processDirectory(dirHandle);
    return files;
  };

  const runPerformanceTests = async (files: FileSystemFileHandle[]) => {
    // --- jsmediatags ---
    setStatus('Testing jsmediatags...');
    let startTime = performance.now();
    for (const fileHandle of files) {
      const file = await fileHandle.getFile();
      await new Promise<void>((resolve, reject) => {
        jsmediatags.read(file, { onSuccess: () => resolve(), onError: (e) => reject(e) });
      });
    }
    let endTime = performance.now();
    setResults(prev => [...prev, { library: 'jsmediatags', filesProcessed: files.length, timeTaken: endTime - startTime }]);

    // --- music-metadata-browser ---
    setStatus('Testing music-metadata-browser...');
    startTime = performance.now();
    for (const fileHandle of files) {
      const file = await fileHandle.getFile();
      await mm.parseBlob(file);
    }
    endTime = performance.now();
    setResults(prev => [...prev, { library: 'music-metadata-browser', filesProcessed: files.length, timeTaken: endTime - startTime }]);

    // --- taglib-wasm ---
    if (isTaglibScriptLoaded && window.taglibWasm) {
      setStatus('Testing taglib-wasm...');
      startTime = performance.now();
      try {
        const taglib = await window.taglibWasm.TagLib.initialize({
          locateFile: (path: string) => (path.endsWith('.wasm') ? '/audio/vendor/taglib-wasm/taglib.wasm' : path),
        });

        for (const fileHandle of files) {
          try {
            const file = await fileHandle.getFile();
            const arrayBuffer = await file.arrayBuffer();
            const data = new Uint8Array(arrayBuffer);
            const tfile = await taglib.open(data, file.name);
            tfile.tag(); // Read the tag
            tfile.delete(); // IMPORTANT: Clean up WASM memory
          } catch (error) {
            console.error(`taglib-wasm failed to process ${fileHandle.name}:`, error);
          }
        }
      } catch (error) {
        console.error('Failed to initialize taglib-wasm:', error);
      }
      endTime = performance.now();
      setResults(prev => [...prev, { library: 'taglib-wasm', filesProcessed: files.length, timeTaken: endTime - startTime }]);
    }
  };

  const handleStart = async () => {
    if (!directory || !isTaglibScriptLoaded) return;

    setIsScanning(true);
    setResults([]);
    setStatus('Scanning directory for audio files...');

    const audioFiles = await getAllFiles(directory);
    setStatus(`Found ${audioFiles.length} audio files. Now running tests...`);

    await runPerformanceTests(audioFiles);

    setIsScanning(false);
    setStatus(`Testing complete. Processed ${audioFiles.length} files.`);
  };


  return (
    <div className={styles.container}>
      <h1>Metadata Speed Test</h1>
      <div className={styles.form}>
        <button onClick={handleDirectorySelection} disabled={isScanning}>
           {directory ? `Selected: ${directory.name}` : 'Select Directory'}
        </button>
        <button onClick={handleStart} disabled={!directory || isScanning || !isTaglibScriptLoaded}>
          {isScanning ? 'Scanning...' : 'Start Test'}
        </button>
      </div>
       {!isTaglibScriptLoaded && <p>Loading metadata library...</p>}

      {status && <p>{status}</p>}

      {results.length > 0 && (
        <div className={styles.results}>
          <h2>Results</h2>
          <table className={styles.resultsTable}>
            <thead>
              <tr>
                <th>Library</th>
                <th>Files Processed</th>
                <th>Time Taken (ms)</th>
              </tr>
            </thead>
            <tbody>
              {results.map((result) => (
                <tr key={result.library}>
                  <td>{result.library}</td>
                  <td>{result.filesProcessed}</td>
                  <td>{result.timeTaken.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default TestPage;
