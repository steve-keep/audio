"use client";

import { useState, useEffect, useRef } from 'react';
import styles from './TestPage.module.css';
import jsmediatags from 'jsmediatags';
import * as mm from 'music-metadata';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { toBlobURL } from '@ffmpeg/util';

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
  const [tags, setTags] = useState<any[]>([]);
  const [isTaglibScriptLoaded, setIsTaglibScriptLoaded] = useState(false);
  const [isFFmpegLoaded, setIsFFmpegLoaded] = useState(false);
  const ffmpegRef = useRef<FFmpeg | null>(null);
  const taglibRef = useRef<any | null>(null);
  const [selectedLibrary, setSelectedLibrary] = useState('jsmediatags');

  useEffect(() => {
    const loadLibs = async () => {
      // Load FFmpeg
      const ffmpeg = new FFmpeg();
      const baseURL = '/audio/vendor/ffmpeg-core';
      await ffmpeg.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
        wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
      });
      ffmpegRef.current = ffmpeg;
      setIsFFmpegLoaded(true);
    }
    loadLibs();
  }, []);

  useEffect(() => {
    const loadTaglib = async () => {
      if (window.taglibWasm) {
        const response = await fetch('/audio/vendor/taglib-wasm/taglib.wasm');
        const wasmBinary = await response.arrayBuffer();
        const taglib = await window.taglibWasm.TagLib.initialize({ wasmBinary });
        taglibRef.current = taglib;
        setIsTaglibScriptLoaded(true);
      }
    }

    // Load taglib-wasm script
    if (!window.taglibWasm) {
      const script = document.createElement('script');
      script.src = '/audio/vendor/taglib-wasm/lib-via-script-tag.js';
      script.async = true;
      script.onload = loadTaglib;
      script.onerror = () => console.error('Failed to load the taglib-wasm script.');
      document.body.appendChild(script);
      return () => { document.body.removeChild(script); };
    } else {
      loadTaglib();
    }
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
    setTags([]);
    setStatus(`Testing ${library}...`);
    const startTime = performance.now();
    let filesProcessed = 0;
    const newErrors: string[] = [];
    const newTags: any[] = [];

    try {
      if (library === 'jsmediatags') {
        for (const fileHandle of files) {
          const file = await fileHandle.getFile();
          await new Promise<void>((resolve, reject) => {
            jsmediatags.read(file, {
              onSuccess: (tag) => {
                newTags.push(tag.tags);
                resolve();
              },
              onError: (e) => reject(e),
            });
          });
          filesProcessed++;
        }
      } else if (library === 'music-metadata') {
        for (const fileHandle of files) {
            const file = await fileHandle.getFile();
            const metadata = await mm.parseBlob(file);
            newTags.push(metadata.common);
            filesProcessed++;
        }
      } else if (library === 'taglib-wasm') {
        if (isTaglibScriptLoaded && taglibRef.current) {
          for (const fileHandle of files) {
            try {
              const file = await fileHandle.getFile();
              const arrayBuffer = await file.arrayBuffer();
              const data = new Uint8Array(arrayBuffer);
              const tfile = await taglibRef.current.open(data, file.name);
              const tags = tfile.tag();
              newTags.push({
                title: tags.title,
                artist: tags.artist,
                album: tags.album,
                year: tags.year,
                track: tags.track,
                genre: tags.genre,
              });
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
      } else if (library === 'ffmpeg.wasm') {
        if (isFFmpegLoaded && ffmpegRef.current) {
          const ffmpeg = ffmpegRef.current;
          for (const fileHandle of files) {
            const file = await fileHandle.getFile();
            const arrayBuffer = await file.arrayBuffer();
            const data = new Uint8Array(arrayBuffer);
            await ffmpeg.writeFile(file.name, data);
            await ffmpeg.exec(['-i', file.name, '-f', 'ffmetadata', 'metadata.txt']);
            const metadataOutput = await ffmpeg.readFile('metadata.txt');
            const tags: { [key: string]: string } = {};
            const decoder = new TextDecoder('utf-8');
            decoder.decode(metadataOutput as Uint8Array).split('\n').forEach(line => {
              const [key, ...value] = line.split('=');
              if (key && value.length > 0) {
                tags[key.trim()] = value.join('=').trim();
              }
            });
            newTags.push(tags);
            filesProcessed++;
          }
        } else {
          throw new Error('ffmpeg.wasm is not loaded.');
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
    setTags(newTags);
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
          <option value="music-metadata">music-metadata</option>
          <option value="taglib-wasm">taglib-wasm</option>
          <option value="ffmpeg.wasm">ffmpeg.wasm</option>
        </select>
        <button
          onClick={handleRunTest}
          disabled={
            !directory ||
            isScanning ||
            (selectedLibrary === 'taglib-wasm' && !isTaglibScriptLoaded) ||
            (selectedLibrary === 'ffmpeg.wasm' && !isFFmpegLoaded)
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

      {tags.length > 0 && (
        <div className={styles.results}>
          <h2>Extracted Tags</h2>
          <table className={styles.resultsTable}>
            <thead>
              <tr>
                <th>Title</th>
                <th>Artist</th>
                <th>Album</th>
                <th>Year</th>
                <th>Track</th>
                <th>Genre</th>
              </tr>
            </thead>
            <tbody>
              {tags.map((tag, index) => (
                <tr key={index}>
                  <td>{tag.title}</td>
                  <td>{tag.artist}</td>
                  <td>{tag.album}</td>
                  <td>{tag.year}</td>
                  <td>{tag.track}</td>
                  <td>{tag.genre}</td>
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
