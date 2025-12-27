"use client";

import { useState, useEffect, useRef } from 'react';
import styles from './TestPage.module.css';
import jsmediatags from 'jsmediatags';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { toBlobURL } from '@ffmpeg/util';
import init, { TagController } from 'id3-wasm';

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
  const [isFFmpegLoaded, setIsFFmpegLoaded] = useState(false);
  const ffmpegRef = useRef<FFmpeg | null>(null);
  const [isId3WasmLoaded, setIsId3WasmLoaded] = useState(false);
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

      // Load id3-wasm
      try {
        await init();
        setIsId3WasmLoaded(true);
      } catch (e) {
        console.error("Failed to initialize id3-wasm", e);
      }
    }
    loadLibs();
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
      } else if (library === 'id3-wasm') {
        if (isId3WasmLoaded) {
          for (const fileHandle of files) {
            if (!fileHandle.name.toLowerCase().endsWith('.mp3')) {
              continue; // id3-wasm is for ID3 tags, common in MP3s.
            }
            const file = await fileHandle.getFile();
            const arrayBuffer = await file.arrayBuffer();
            const uint8Array = new Uint8Array(arrayBuffer);

            let tagController;
            let metadata;
            try {
              tagController = TagController.from(uint8Array);
              metadata = tagController.getMetadata();
              // Copy data to a plain JS object before wasm memory is freed.
              const plainTags = {
                title: metadata.title,
                artist: metadata.artist,
                album: metadata.album,
                year: metadata.year,
                track: (metadata as any).track,
                genre: (metadata as any).genre,
              };
              newTags.push(plainTags);
            } catch (e) {
              const errorMessage = e instanceof Error ? e.message : String(e);
              newErrors.push(`${fileHandle.name}: ${errorMessage}`);
            } finally {
              if (metadata) metadata.free();
              if (tagController) tagController.free();
            }
            filesProcessed++;
          }
        } else {
          throw new Error('id3-wasm is not loaded.');
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

  const runPerformanceTestParallel = async (files: FileSystemFileHandle[], library: string) => {
    setResults([]);
    setErrors([]);
    setTags([]);
    setStatus(`Testing ${library} in parallel...`);
    const startTime = performance.now();

    const numWorkers = navigator.hardwareConcurrency || 2;
    const workers: Worker[] = [];
    const filesPerWorker = Math.ceil(files.length / numWorkers);
    const promises: Promise<{ results: any[], errors: string[] }>[] = [];

    for (let i = 0; i < numWorkers; i++) {
      const worker = new Worker('/workers/metadata-worker.js');
      workers.push(worker);

      const start = i * filesPerWorker;
      const end = start + filesPerWorker;
      const chunk = files.slice(start, end);

      if (chunk.length > 0) {
        const promise = new Promise<{ results: any[], errors: string[] }>((resolve, reject) => {
          worker.onmessage = (event) => {
            if (event.data.error) {
              reject(new Error(event.data.error));
            } else {
              resolve(event.data);
            }
            worker.terminate();
          };
          worker.onerror = (error) => {
            reject(error);
            worker.terminate();
          };

          // For FileSystemFileHandle, we need to get the File object first
          Promise.all(chunk.map(handle => handle.getFile())).then(fileObjects => {
            // Pass the array of File objects to the worker
            worker.postMessage({ files: fileObjects, library });
          });
        });
        promises.push(promise);
      }
    }

    try {
      const allResults = await Promise.all(promises);
      const combinedResults = allResults.flatMap(r => r.results);
      const combinedErrors = allResults.flatMap(r => r.errors);

      const endTime = performance.now();
      setResults([{ library: `${library} (Parallel)`, filesProcessed: combinedResults.length, timeTaken: endTime - startTime }]);
      setErrors(combinedErrors);
      setTags(combinedResults);

    } catch (error) {
      const endTime = performance.now();
      setStatus(`Error during parallel testing: ${error instanceof Error ? error.message : String(error)}`);
      setResults([{ library: `${library} (Parallel)`, filesProcessed: 0, timeTaken: endTime - startTime }]);
    } finally {
      workers.forEach(worker => worker.terminate());
    }
  };

  const handleRunTest = async () => {
    if (!directory) return;

    setIsScanning(true);
    setStatus('Scanning directory for audio files...');

    const audioFiles = await getAllFiles(directory);
    setStatus(`Found ${audioFiles.length} audio files. Now running test...`);

    if (selectedLibrary.endsWith('-parallel')) {
      await runPerformanceTestParallel(audioFiles, selectedLibrary.replace('-parallel', ''));
    } else {
      await runPerformanceTest(audioFiles, selectedLibrary);
    }

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
          <option value="ffmpeg.wasm">ffmpeg.wasm</option>
          <option value="id3-wasm">id3-wasm</option>
          <option value="jsmediatags-parallel">jsmediatags (Parallel)</option>
          <option value="ffmpeg.wasm-parallel">ffmpeg.wasm (Parallel)</option>
          <option value="id3-wasm-parallel">id3-wasm (Parallel)</option>
        </select>
        <button
          onClick={handleRunTest}
          disabled={
            !directory ||
            isScanning ||
            (selectedLibrary === 'ffmpeg.wasm' && !isFFmpegLoaded) ||
            (selectedLibrary === 'id3-wasm' && !isId3WasmLoaded)
          }
        >
          {isScanning ? 'Scanning...' : 'Run Test'}
        </button>
      </div>

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
