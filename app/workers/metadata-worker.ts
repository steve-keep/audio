// app/workers/metadata-worker.ts
import jsmediatags from 'jsmediatags';
import init, { TagController } from 'id3-wasm';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { toBlobURL } from '@ffmpeg/util';

let isId3WasmLoaded = false;
const loadId3Wasm = async () => {
  if (isId3WasmLoaded) return;
  try {
    await init();
    isId3WasmLoaded = true;
  } catch (e) {
    console.error("Failed to initialize id3-wasm in worker", e);
    postMessage({ error: `Failed to initialize id3-wasm: ${(e as Error).message}` });
  }
};

let isFFmpegLoaded = false;
let ffmpeg: FFmpeg | null = null;
const loadFFmpeg = async () => {
  if (isFFmpegLoaded) return;
  ffmpeg = new FFmpeg();
  // Since this is a module worker, Next.js will handle bundling and serving the core files.
  // The default paths should work.
  try {
    await ffmpeg.load();
    isFFmpegLoaded = true;
  } catch(e) {
    console.error("Failed to initialize ffmpeg.wasm in worker", e);
    postMessage({ error: `Failed to initialize ffmpeg.wasm: ${(e as Error).message}` });
  }
};

self.onmessage = async (event: MessageEvent<{ files: File[], library: string }>) => {
  const { files, library } = event.data;

  const results = [];
  const errors = [];

  try {
    if (library === 'jsmediatags') {
      for (const file of files) {
        try {
          const tags = await new Promise((resolve, reject) => {
            jsmediatags.read(file, {
              onSuccess: (tag) => resolve(tag.tags),
              onError: (e) => reject(new Error(e.info)),
            });
          });
          results.push(tags);
        } catch (e) {
          errors.push(`${file.name}: ${(e as Error).message}`);
        }
      }
    } else if (library === 'id3-wasm') {
      await loadId3Wasm();
      if (!isId3WasmLoaded) return;

      for (const file of files) {
        if (!file.name.toLowerCase().endsWith('.mp3')) continue;
        try {
          const arrayBuffer = await file.arrayBuffer();
          const uint8Array = new Uint8Array(arrayBuffer);
          let tagController, metadata;
          try {
            tagController = TagController.from(uint8Array);
            metadata = tagController.getMetadata();
            const plainTags = {
              title: metadata.title,
              artist: metadata.artist,
              album: metadata.album,
              year: metadata.year,
              track: (metadata as any).track,
              genre: (metadata as any).genre,
            };
            results.push(plainTags);
          } finally {
            if (metadata) metadata.free();
            if (tagController) tagController.free();
          }
        } catch (e) {
          errors.push(`${file.name}: ${(e as Error).message}`);
        }
      }
    } else if (library === 'ffmpeg.wasm') {
        await loadFFmpeg();
        if (!isFFmpegLoaded || !ffmpeg) return;

        for (const file of files) {
            try {
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
                results.push(tags);
            } catch(e) {
                errors.push(`${file.name}: ${(e as Error).message}`);
            }
        }
    }

    postMessage({ results, errors });

  } catch (e) {
    postMessage({ error: `An unexpected error occurred in the worker: ${(e as Error).message}` });
  }
};

// This is needed to make TypeScript treat this file as a module.
export {};
