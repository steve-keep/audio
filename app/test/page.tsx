"use client";

import { useState } from 'react';
import jsmediatags from 'jsmediatags';
import styles from './TestPage.module.css';

const TestPage = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedLibrary, setSelectedLibrary] = useState('jsmediatags');
  const [metadata, setMetadata] = useState<{ [key: string]: string } | null>(null);
  const [elapsedTime, setElapsedTime] = useState<number | null>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      setSelectedFile(event.target.files[0]);
    }
  };

  const handleLibraryChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedLibrary(event.target.value);
  };

  const handleStart = () => {
    if (selectedFile) {
      const startTime = performance.now();
      jsmediatags.read(selectedFile, {
        onSuccess: (tag) => {
          const endTime = performance.now();
          setElapsedTime(endTime - startTime);
          setMetadata({
            title: tag.tags.title,
            artist: tag.tags.artist,
            album: tag.tags.album,
          });
        },
        onError: (error) => {
          console.error(error);
          setElapsedTime(null);
          setMetadata(null);
        },
      });
    }
  };

  return (
    <div className={styles.container}>
      <h1>Metadata Speed Test</h1>
      <div className={styles.form}>
        <div className={styles.row}>
          <label htmlFor="file-input">Select MP3 File:</label>
          <input id="file-input" type="file" accept=".mp3" onChange={handleFileChange} />
        </div>
        <div className={styles.row}>
          <label htmlFor="library-select">Select Library:</label>
          <select id="library-select" value={selectedLibrary} onChange={handleLibraryChange}>
            <option value="jsmediatags">jsmediatags</option>
          </select>
        </div>
        <button onClick={handleStart} disabled={!selectedFile}>
          Start
        </button>
      </div>
      {elapsedTime !== null && (
        <div className={styles.results}>
          <h2>Results</h2>
          <p>Time Taken: {elapsedTime.toFixed(2)} ms</p>
          {metadata && (
            <div>
              <h3>Metadata</h3>
              <pre>{JSON.stringify(metadata, null, 2)}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TestPage;
