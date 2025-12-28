"use client";

import { useState, useEffect, useRef } from 'react';
import { useScanProgress } from '../context/ScanProgressContext';
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
  const { setStatus: setScanStatus, setFound, setProcessed, reset: resetScanProgress } = useScanProgress();

  useEffect(() => {
    const loadLibs = async () => {
      // Load FFmpeg
      const ffmpeg = new FFmpeg();
      await ffmpeg.load();
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

  const processFilesInBatches = async function* (
    dirHandle: FileSystemDirectoryHandle,
    batchSize: number
  ): AsyncGenerator<FileSystemFileHandle[]> {
    let fileBatch: FileSystemFileHandle[] = [];
    let totalFound = 0;

    // Corrected recursive batching logic
    const subdirectoryStack: FileSystemDirectoryHandle[] = [dirHandle];
    while (subdirectoryStack.length > 0) {
      const currentDir = subdirectoryStack.pop()!;
      for await (const entry of currentDir.values()) {
        if (entry.kind === 'file') {
          const isSupported = SUPPORTED_EXTENSIONS.some(ext => entry.name.toLowerCase().endsWith(ext));
          if (isSupported) {
            fileBatch.push(entry);
            totalFound++;
            setFound(totalFound);
            if (fileBatch.length >= batchSize) {
              yield fileBatch;
              fileBatch = [];
            }
          }
        } else if (entry.kind === 'directory') {
          subdirectoryStack.push(entry);
        }
      }
    }


    if (fileBatch.length > 0) {
      yield fileBatch;
    }
  };

  const runPerformanceTest = async (library: string) => {
    if (!directory) return;

    setResults([]);
    setErrors([]);
    setTags([]);
    setStatus(`Testing ${library}...`);
    const startTime = performance.now();
    let totalFilesProcessed = 0;
    const newErrors: string[] = [];
    const allTags: any[] = [];

    setProcessed(0);

    try {
      const batchSize = 20; // Process 20 files at a time for the sequential test
      for await (const batch of processFilesInBatches(directory, batchSize)) {
        const batchTags: any[] = [];
        const batchErrors: string[] = [];

        if (library === 'jsmediatags') {
          await Promise.all(batch.map(async (fileHandle) => {
            const file = await fileHandle.getFile();
            return new Promise<void>((resolve) => {
              jsmediatags.read(file, {
                onSuccess: (tag) => {
                  batchTags.push(tag.tags);
                  resolve();
                },
                onError: (e) => {
                  batchErrors.push(`${fileHandle.name}: ${e.type} - ${e.info}`);
                  resolve(); // Don't reject, just record the error and continue
                },
              });
            });
          }));
        } else if (library === 'ffmpeg.wasm') {
          if (!isFFmpegLoaded || !ffmpegRef.current) throw new Error('ffmpeg.wasm is not loaded.');
          const ffmpeg = ffmpegRef.current;
          for (const fileHandle of batch) {
            try {
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
                if (key && value.length > 0) tags[key.trim()] = value.join('=').trim();
              });
              batchTags.push(tags);
            } catch (e) {
               const errorMessage = e instanceof Error ? e.message : String(e);
               batchErrors.push(`${fileHandle.name}: ${errorMessage}`);
            }
          }
        } else if (library === 'id3-wasm') {
          if (!isId3WasmLoaded) throw new Error('id3-wasm is not loaded.');
          for (const fileHandle of batch) {
            if (!fileHandle.name.toLowerCase().endsWith('.mp3')) continue;
            const file = await fileHandle.getFile();
            const arrayBuffer = await file.arrayBuffer();
            const uint8Array = new Uint8Array(arrayBuffer);
            let tagController;
            let metadata;
            try {
              tagController = TagController.from(uint8Array);
              metadata = tagController.getMetadata();
              batchTags.push({
                title: metadata.title, artist: metadata.artist, album: metadata.album,
                year: metadata.year, track: (metadata as any).track, genre: (metadata as any).genre,
              });
            } catch (e) {
              const errorMessage = e instanceof Error ? e.message : String(e);
              batchErrors.push(`${fileHandle.name}: ${errorMessage}`);
            } finally {
              if (metadata) metadata.free();
              if (tagController) tagController.free();
            }
          }
        }

        totalFilesProcessed += batch.length;
        setProcessed(totalFilesProcessed);
        allTags.push(...batchTags);
        setTags(currentTags => [...currentTags, ...batchTags]);
        newErrors.push(...batchErrors);
        setErrors(currentErrors => [...currentErrors, ...batchErrors]);

        const intermediateTime = performance.now();
        setResults([{ library, filesProcessed: totalFilesProcessed, timeTaken: intermediateTime - startTime }]);
        setStatus(`Processing... Found: ${totalFilesProcessed}, Processed: ${totalFilesProcessed}`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      setStatus(`Error during testing ${library}: ${errorMessage}`);
      console.error(error);
      const endTime = performance.now();
      setResults(prev => [{ library: prev[0]?.library || library, filesProcessed: totalFilesProcessed, timeTaken: endTime - startTime }]);
      setErrors(newErrors);
      return;
    }

    const endTime = performance.now();
    setResults([{ library, filesProcessed: totalFilesProcessed, timeTaken: endTime - startTime }]);
  };

  const runPerformanceTestParallel = async (library: string) => {
    if (!directory) return;

    setResults([]);
    setErrors([]);
    setTags([]);
    setStatus(`Testing ${library} in parallel...`);
    const startTime = performance.now();
    let totalFilesProcessed = 0;

    setProcessed(0);

    const numWorkers = navigator.hardwareConcurrency || 4;
    const batchSize = numWorkers * 10; // Give each worker 10 files per batch

    try {
      for await (const batch of processFilesInBatches(directory, batchSize)) {
        const workers: Worker[] = [];
        const promises: Promise<{ results: any[], errors: string[] }>[] = [];
        const filesPerWorker = Math.ceil(batch.length / numWorkers);

        for (let i = 0; i < numWorkers; i++) {
          const worker = new Worker(new URL('../workers/metadata-worker.ts', import.meta.url), { type: 'module' });
          workers.push(worker);

          const start = i * filesPerWorker;
          const end = start + filesPerWorker;
          const chunk = batch.slice(start, end);

          if (chunk.length > 0) {
            const promise = new Promise<{ results: any[], errors: string[] }>((resolve, reject) => {
              worker.onmessage = (event) => {
                if (event.data.error) reject(new Error(event.data.error));
                else resolve(event.data);
                worker.terminate();
              };
              worker.onerror = (error) => {
                reject(error);
                worker.terminate();
              };
              Promise.all(chunk.map(handle => handle.getFile())).then(fileObjects => {
                worker.postMessage({ files: fileObjects, library });
              });
            });
            promises.push(promise);
          }
        }

        const allResults = await Promise.all(promises);
        const combinedResults = allResults.flatMap(r => r.results);
        const combinedErrors = allResults.flatMap(r => r.errors);

        const successfullyProcessedInBatch = combinedResults.length;
        totalFilesProcessed += successfullyProcessedInBatch;
        setProcessed(currentCount => currentCount + successfullyProcessedInBatch);
        setTags(currentTags => [...currentTags, ...combinedResults]);
        setErrors(currentErrors => [...currentErrors, ...combinedErrors]);

        const intermediateTime = performance.now();
        setResults([{ library: `${library} (Parallel)`, filesProcessed: totalFilesProcessed, timeTaken: intermediateTime - startTime }]);
        setStatus(`Processing... Processed: ${totalFilesProcessed}`);
      }
      const endTime = performance.now();
      setResults([{ library: `${library} (Parallel)`, filesProcessed: totalFilesProcessed, timeTaken: endTime - startTime }]);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      setStatus(`Error during parallel testing: ${errorMessage}`);
      const endTime = performance.now();
      setResults([{ library: `${library} (Parallel)`, filesProcessed: totalFilesProcessed, timeTaken: endTime - startTime }]);
    }
  };

  const handleRunTest = async () => {
    if (!directory) return;

    setIsScanning(true);
    resetScanProgress();
    setFound(0);
    setProcessed(0);
    setScanStatus('running');
    setStatus('Starting test...');

    try {
      const library = selectedLibrary.replace('-parallel', '');
      const isParallel = selectedLibrary.endsWith('-parallel');

      if (isParallel) {
        await runPerformanceTestParallel(library);
      } else {
        await runPerformanceTest(library);
      }

      setScanStatus('success');
      setStatus(`Testing complete for ${selectedLibrary}.`);
    } catch (error) {
      setScanStatus('error');
      const errorMessage = error instanceof Error ? error.message : String(error);
      setStatus(`An error occurred during the test: ${errorMessage}`);
      console.error(error);
    } finally {
      setIsScanning(false);
    }
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
