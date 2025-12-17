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
  const [errors, setErrors] = useState<string[]>([]);
  const [isTaglibScriptLoaded, setIsTaglibScriptLoaded] = useState(false);
  const [selectedLibrary, setSelectedLibrary] = useState('jsmediatags');

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

  const runPerformanceTest = async (files: FileSystemFileHandle[], library: string) => {
    setResults([]);
    setErrors([]);
    setStatus(`Testing ${library}...`);
    const startTime = performance.now();
    let filesProcessed = 0;
    const newErrors: string[] = [];

    try {
      if (library === 'jsmediatags') {
        for (const fileHandle of files) {
          const file = await fileHandle.getFile();
          await new Promise<void>((resolve, reject) => {
            jsmediatags.read(file, { onSuccess: () => resolve(), onError: (e) => reject(e) });
          });
          filesProcessed++;
        }
      } else if (library === 'music-metadata-browser') {
        for (const fileHandle of files) {
          const file = await fileHandle.getFile();
          await mm.parseBlob(file);
          filesProcessed++;
        }
      } else if (library === 'taglib-wasm') {
        if (isTaglibScriptLoaded && window.taglibWasm) {
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
              tfile.dispose(); // IMPORTANT: Clean up WASM memory
              filesProcessed++;
            } catch (error) {
              const errorMessage = `taglib-wasm failed to process ${fileHandle.name}: ${error instanceof Error ? error.message : String(error)}`;
              console.error(errorMessage);
              newErrors.push(errorMessage);
            }
          }
        } else {
          throw new Error('taglib-wasm is not loaded.');
        }
      }
    } catch (error) {
      setStatus(`Error during testing ${library}: ${error instanceof Error ? error.message : String(error)}`);
      console.error(error);
      // Stop the timer and update results even if there was an error
      const endTime = performance.now();
      setResults([{ library, filesProcessed, timeTaken: endTime - startTime }]);
      setErrors(newErrors);
      return; // Exit the function
    }

    const endTime = performance.now();
    setResults([{ library, filesProcessed, timeTaken: endTime - startTime }]);
    setErrors(newErrors);
  };

  const handleRunTest = async () => {
    if (!directory) return;

    setIsScanning(true);
    setStatus('Scanning directory for audio files...');

    const audioFiles = await getAllFiles(directory);
    setStatus(`Found ${audioFiles.length} audio files. Now running test...`);

    await runPerformanceTest(audioFiles, selectedLibrary);

    setIsScanning(false);
    setStatus(`Testing complete. Processed ${audioFiles.length} files with ${selectedLibrary}.`);
  };


  return (
    <div className={styles.container}>
      <h1>Metadata Speed Test</h1>
      <div className={styles.form}>
        <button onClick={handleDirectorySelection} disabled={isScanning}>
           {directory ? `Selected: ${directory.name}` : 'Select Directory'}
        </button>
        <select value={selectedLibrary} onChange={(e) => setSelectedLibrary(e.target.value)}>
          <option value="jsmediatags">jsmediatags</option>
          <option value="music-metadata-browser">music-metadata-browser</option>
          <option value="taglib-wasm">taglib-wasm</option>
        </select>
        <button
          onClick={handleRunTest}
          disabled={
            !directory ||
            isScanning ||
            (selectedLibrary === 'taglib-wasm' && !isTaglibScriptLoaded)
          }
        >
          {isScanning ? 'Scanning...' : 'Run Test'}
        </button>
      </div>
       {!isTaglibScriptLoaded && <p>Loading metadata library...</p>}

      {status && <p>{status}</p>}

      {errors.length > 0 && (
        <div className={styles.errors}>
          <h2>Errors</h2>
          <ul>
            {errors.map((error, index) => (
              <li key={index}>{error}</li>
            ))}
          </ul>
        </div>
      )}

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
