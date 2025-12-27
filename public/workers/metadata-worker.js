// public/workers/metadata-worker.js

// Import necessary libraries
self.importScripts(
  '/vendor/jsmediatags/jsmediatags.min.js',
  '/vendor/id3-wasm/index.js',
  '/vendor/ffmpeg/ffmpeg.js',
  '/vendor/ffmpeg/util.js'
);

let isId3WasmLoaded = false;
const loadId3Wasm = async () => {
  if (isId3WasmLoaded) return;
  try {
    // id3-wasm expects the wasm file to be loaded relative to its script.
    // We need to configure it to load from the correct vendor path.
    await self.id3.init('/vendor/id3-wasm/id3_wasm_bg.wasm');
    isId3WasmLoaded = true;
  } catch (e) {
    console.error("Failed to initialize id3-wasm in worker", e);
    postMessage({ error: `Failed to initialize id3-wasm: ${e.message}` });
  }
};

let isFFmpegLoaded = false;
let ffmpeg;
const loadFFmpeg = async () => {
  if (isFFmpegLoaded) return;
  ffmpeg = new self.FFmpeg.FFmpeg();
  const baseURL = '/vendor/ffmpeg-core';
  try {
    await ffmpeg.load({
      coreURL: await self.FFmpegUtil.toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await self.FFmpegUtil.toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
    });
    isFFmpegLoaded = true;
  } catch(e) {
    console.error("Failed to initialize ffmpeg.wasm in worker", e);
    postMessage({ error: `Failed to initialize ffmpeg.wasm: ${e.message}` });
  }
};


self.onmessage = async (event) => {
  const { files, library } = event.data;

  const results = [];
  const errors = [];

  try {
    if (library === 'jsmediatags') {
      for (const file of files) {
        try {
          const tags = await new Promise((resolve, reject) => {
            self.jsmediatags.read(file, {
              onSuccess: (tag) => resolve(tag.tags),
              onError: (e) => reject(e),
            });
          });
          results.push(tags);
        } catch (e) {
          errors.push(`${file.name}: ${e.message}`);
        }
      }
    } else if (library === 'id3-wasm') {
      await loadId3Wasm();
      if (!isId3WasmLoaded) return; // Exit if loading failed

      for (const file of files) {
        if (!file.name.toLowerCase().endsWith('.mp3')) continue;
        try {
          const arrayBuffer = await file.arrayBuffer();
          const uint8Array = new Uint8Array(arrayBuffer);
          let tagController, metadata;
          try {
            tagController = self.id3.TagController.from(uint8Array);
            metadata = tagController.getMetadata();
            const plainTags = {
              title: metadata.title,
              artist: metadata.artist,
              album: metadata.album,
              year: metadata.year,
              track: metadata.track,
              genre: metadata.genre,
            };
            results.push(plainTags);
          } finally {
            if (metadata) metadata.free();
            if (tagController) tagController.free();
          }
        } catch (e) {
          errors.push(`${file.name}: ${e.message}`);
        }
      }
    } else if (library === 'ffmpeg.wasm') {
      await loadFFmpeg();
      if (!isFFmpegLoaded) return; // Exit if loading failed

      for (const file of files) {
          try {
              const arrayBuffer = await file.arrayBuffer();
              const data = new Uint8Array(arrayBuffer);
              await ffmpeg.writeFile(file.name, data);
              await ffmpeg.exec(['-i', file.name, '-f', 'ffmetadata', 'metadata.txt']);
              const metadataOutput = await ffmpeg.readFile('metadata.txt');
              const tags = {};
              const decoder = new TextDecoder('utf-8');
              decoder.decode(metadataOutput).split('\n').forEach(line => {
                  const [key, ...value] = line.split('=');
                  if (key && value.length > 0) {
                      tags[key.trim()] = value.join('=').trim();
                  }
              });
              results.push(tags);
          } catch(e) {
              errors.push(`${file.name}: ${e.message}`);
          }
      }
    }

    // Send the results back to the main thread
    postMessage({ results, errors });

  } catch (e) {
    postMessage({ error: `An unexpected error occurred in the worker: ${e.message}` });
  }
};
