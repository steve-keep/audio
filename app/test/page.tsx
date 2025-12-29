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
  const [batchSize, setBatchSize] = useState(5);
  const { setStatus: setScanStatus, setFound, setProcessed, reset: resetScanProgress } = useScanProgress();
  const scanCancelledRef = useRef(false);

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

  async function* findFilesRecursively(directoryHandle: FileSystemDirectoryHandle): AsyncGenerator<FileSystemFileHandle> {
    const subdirectoryStack: FileSystemDirectoryHandle[] = [directoryHandle];
    let totalFound = 0;
    let entriesProcessed = 0;

    while (subdirectoryStack.length > 0) {
      if (scanCancelledRef.current) return;
      const currentDir = subdirectoryStack.pop()!;
      for await (const entry of currentDir.values()) {
        if (scanCancelledRef.current) return;
        entriesProcessed++;
        if (entriesProcessed % 100 === 0) {
          await new Promise(r => setTimeout(r, 0));
        }

        if (entry.kind === 'file') {
          const isSupported = SUPPORTED_EXTENSIONS.some(ext => entry.name.toLowerCase().endsWith(ext));
          if (isSupported) {
            totalFound++;
            setFound(totalFound);
            yield entry;
          }
        } else if (entry.kind === 'directory') {
          subdirectoryStack.push(entry);
        }
      }
    }
  }

  const runPerformanceTest = async (library: string) => {
    if (!directory) return;

    setResults([]);
    setErrors([]);
    setTags([]);
    setStatus(`Testing ${library}...`);
    const startTime = performance.now();
    let totalFilesProcessed = 0;
    let totalFilesFound = 0;
    const localTags: any[] = [];
    const localErrors: string[] = [];

    setProcessed(0);

    const fileIterator = findFilesRecursively(directory);

    for await (const fileHandle of fileIterator) {
      if (scanCancelledRef.current) break;
      totalFilesFound++;

      let success = false;
      if (library === 'jsmediatags') {
        const file = await fileHandle.getFile();
        success = await new Promise<boolean>((resolve) => {
          jsmediatags.read(file, {
            onSuccess: (tag) => {
              localTags.push(tag.tags);
              resolve(true);
            },
            onError: (e) => {
              localErrors.push(`${fileHandle.name}: ${e.type} - ${e.info}`);
              resolve(false);
            },
          });
        });
      } else if (library === 'ffmpeg.wasm') {
        if (!isFFmpegLoaded || !ffmpegRef.current) throw new Error('ffmpeg.wasm is not loaded.');
        const ffmpeg = ffmpegRef.current;
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
          localTags.push(tags);
          success = true;
        } catch (e) {
          const errorMessage = e instanceof Error ? e.message : String(e);
          localErrors.push(`${fileHandle.name}: ${errorMessage}`);
        }
      } else if (library === 'id3-wasm') {
        if (!isId3WasmLoaded) throw new Error('id3-wasm is not loaded.');
        if (!fileHandle.name.toLowerCase().endsWith('.mp3')) continue;
        const file = await fileHandle.getFile();
        const arrayBuffer = await file.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);
        let tagController;
        let metadata;
        try {
          tagController = TagController.from(uint8Array);
          metadata = tagController.getMetadata();
          localTags.push({
            title: metadata.title, artist: metadata.artist, album: metadata.album,
            year: metadata.year, track: (metadata as any).track, genre: (metadata as any).genre,
          });
          success = true;
        } catch (e) {
          const errorMessage = e instanceof Error ? e.message : String(e);
          localErrors.push(`${fileHandle.name}: ${errorMessage}`);
        } finally {
          if (metadata) metadata.free();
          if (tagController) tagController.free();
        }
      }

      if (success) {
        totalFilesProcessed++;
        setProcessed(totalFilesProcessed);
      }

      const intermediateTime = performance.now();
      setResults([{ library, filesProcessed: totalFilesProcessed, timeTaken: intermediateTime - startTime }]);
      setStatus(`Processing... Processed ${totalFilesProcessed} of ${totalFilesFound} files found.`);
    }

    const endTime = performance.now();
    setResults([{ library, filesProcessed: totalFilesProcessed, timeTaken: endTime - startTime }]);
    setTags(localTags);
    setErrors(localErrors);

    if (scanCancelledRef.current) {
      setStatus(`Scan stopped. Processed ${totalFilesProcessed} of ${totalFilesFound} files in ${(endTime - startTime) / 1000} seconds.`);
    } else {
      setStatus(`Scan complete. Processed ${totalFilesProcessed} of ${totalFilesFound} files in ${(endTime - startTime) / 1000} seconds.`);
    }
  };

  const runPerformanceTestParallel = async (library: string) => {
    if (!directory) return;

    setResults([]);
    setErrors([]);
    setTags([]);
    setStatus(`Testing ${library} in parallel...`);
    const startTime = performance.now();
    let totalFilesProcessed = 0;
    let totalFilesFound = 0;
    const localTags: any[] = [];
    const localErrors: string[] = [];

    setProcessed(0);

    const numWorkers = Math.max(1, (navigator.hardwareConcurrency || 2) - 1);
    const workers: Worker[] = [];
    const fileIterator = findFilesRecursively(directory);

    await new Promise<void>((resolve) => {
      let activeWorkers = 0;
      let iteratorDone = false;

      const onDone = () => {
        if (iteratorDone && activeWorkers === 0) {
          resolve();
        }
      };

      const processNextFile = async (worker: Worker) => {
        if (scanCancelledRef.current) {
          onDone();
          return;
        }

        const next = await fileIterator.next();
        if (next.done) {
          iteratorDone = true;
          onDone();
          return;
        }

        totalFilesFound++;
        activeWorkers++;
        const file = await next.value.getFile();
        worker.postMessage({ files: [file], library });
      };

      for (let i = 0; i < numWorkers; i++) {
        const worker = new Worker(new URL('../workers/metadata-worker.ts', import.meta.url), { type: 'module' });
        workers.push(worker);

        worker.onmessage = (event) => {
          if (scanCancelledRef.current) {
            onDone();
            return;
          }
          const { results, errors } = event.data;
          totalFilesProcessed++;
          activeWorkers--;
          setProcessed(p => p + 1);
          localTags.push(...results);
          localErrors.push(...errors);

          const intermediateTime = performance.now();
          setResults([{ library: `${library} (Parallel)`, filesProcessed: totalFilesProcessed, timeTaken: intermediateTime - startTime }]);
          setStatus(`Processing... Processed ${totalFilesProcessed} of ${totalFilesFound} files found.`);
          processNextFile(worker);
        };
        worker.onerror = (error) => {
          console.error('Worker error:', error);
          activeWorkers--;
          processNextFile(worker);
        };
        processNextFile(worker);
      }
    });

    workers.forEach(worker => worker.terminate());

    const endTime = performance.now();
    setResults([{ library: `${library} (Parallel)`, filesProcessed: totalFilesProcessed, timeTaken: endTime - startTime }]);
    setTags(localTags);
    setErrors(localErrors);

    if (scanCancelledRef.current) {
      setStatus(`Scan stopped. Processed ${totalFilesProcessed} of ${totalFilesFound} files in ${(endTime - startTime) / 1000} seconds.`);
    } else {
      setStatus(`Scan complete. Processed ${totalFilesProcessed} of ${totalFilesFound} files in ${(endTime - startTime) / 1000} seconds.`);
    }
  };

  const handleRunTest = async () => {
    if (!directory) return;

    setIsScanning(true);
    scanCancelledRef.current = false;
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
        <div className={styles.inputGroup}>
          <label htmlFor="batchSize">Batch Size:</label>
          <input
            type="number"
            id="batchSize"
            value={batchSize}
            onChange={(e) => {
              const val = e.target.value === '' ? 1 : parseInt(e.target.value, 10);
              setBatchSize(Math.max(1, Math.min(100, val)));
            }}
            min="1"
            max="100"
            disabled={isScanning}
          />
        </div>
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
        {isScanning && (
          <button
            onClick={() => {
              scanCancelledRef.current = true;
            }}
            className={styles.stopButton}
          >
            Stop
          </button>
        )}
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
