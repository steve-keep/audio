import initSqlJs, { Database } from "sql.js";

let db: Database | null = null;

const DB_NAME = "audio-indexer-db";
const DB_STORE_NAME = "database";

function openIndexedDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onerror = () => reject("Error opening IndexedDB");
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      db.createObjectStore(DB_STORE_NAME);
    };
  });
}

async function loadDbFromIndexedDB(): Promise<Uint8Array | null> {
  const idb = await openIndexedDB();
  return new Promise((resolve, reject) => {
    const transaction = idb.transaction(DB_STORE_NAME, "readonly");
    const store = transaction.objectStore(DB_STORE_NAME);
    const request = store.get("db");
    request.onerror = () => reject("Error loading from IndexedDB");
    request.onsuccess = () => resolve(request.result);
  });
}

export async function saveDbToIndexedDB() {
  if (!db) return;
  const data = db.export();
  const idb = await openIndexedDB();
  const transaction = idb.transaction(DB_STORE_NAME, "readwrite");
  const store = transaction.objectStore(DB_STORE_NAME);
  store.put(data, "db");
}


export async function initDB() {
  if (db) return db;

  const SQL = await initSqlJs({
    locateFile: (file: any) => `https://sql.js.org/dist/${file}`,
  });
  const dbData = await loadDbFromIndexedDB();
  if (dbData) {
    db = new SQL.Database(dbData);
  } else {
    db = new SQL.Database();
  }
  createTables();
  return db;
}

export function createTables() {
  if (!db) return;
  const query = `
    CREATE TABLE IF NOT EXISTS tracks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT,
      artist TEXT,
      album TEXT,
      track TEXT
    );
  `;
  db.run(query);
}

export function insertTrack(track: any) {
  if (!db) return;
  const stmt = db.prepare(
    "INSERT INTO tracks (title, artist, album, track) VALUES (?, ?, ?, ?)"
  );
  stmt.run([track.title, track.artist, track.album, track.track]);
  stmt.free();
}

export function getAlbums() {
    if (!db) return [];
    const res = db.exec("SELECT DISTINCT album FROM tracks ORDER BY album");
    if (res.length === 0) {
        return [];
    }
    return res[0].values.map((row: any) => row[0]);
}

export function getTracksByAlbum(albumName: string) {
    if (!db) return [];
    const stmt = db.prepare("SELECT title, artist, album, track FROM tracks WHERE album = ? ORDER BY CAST(track AS INTEGER)");
    stmt.bind([albumName]);
    const tracks: any[] = [];
    while (stmt.step()) {
        tracks.push(stmt.getAsObject());
    }
    stmt.free();
    return tracks;
}
