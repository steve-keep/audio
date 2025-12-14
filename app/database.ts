import initSqlJs, { Database, SqlJsStatic } from "sql.js";

let db: Database | null = null;
let SQL: SqlJsStatic | null = null;

const DB_NAME = "audio-indexer-db";
const DB_STORE_NAME = "database";

async function initializeSql(): Promise<SqlJsStatic> {
  if (SQL) return SQL;
  SQL = await initSqlJs({
    locateFile: (file: string) => `https://sql.js.org/dist/${file}`,
  });
  return SQL;
}

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

  const sql = await initializeSql();
  const dbData = await loadDbFromIndexedDB();
  if (dbData) {
    db = new sql.Database(dbData);
  } else {
    db = new sql.Database();
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
    CREATE TABLE IF NOT EXISTS artists (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE,
      imageUrl TEXT
    );
    CREATE TABLE IF NOT EXISTS albums (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      artistName TEXT,
      imageUrl TEXT,
      UNIQUE(name, artistName)
    );
  `;
  db.run(query);
}

export interface Track {
  title: string;
  artist: string;
  album: string;
  track: string;
}

export interface Artist {
  name: string;
  imageUrl: string;
}

export interface Album {
  name: string;
  artistName: string;
  imageUrl: string;
}

export function insertTrack(track: Track) {
  if (!db) return;
  const stmt = db.prepare(
    "INSERT INTO tracks (title, artist, album, track) VALUES (?, ?, ?, ?)"
  );
  stmt.run([track.title, track.artist, track.album, track.track]);
  stmt.free();
}

export function insertArtist(artist: Artist) {
  if (!db) return;
  const stmt = db.prepare(
    "INSERT OR IGNORE INTO artists (name, imageUrl) VALUES (?, ?)"
  );
  stmt.run([artist.name, artist.imageUrl]);
  stmt.free();
}

export function insertAlbum(album: Album) {
  if (!db) return;
  const stmt = db.prepare(
    "INSERT OR IGNORE INTO albums (name, artistName, imageUrl) VALUES (?, ?, ?)"
  );
  stmt.run([album.name, album.artistName, album.imageUrl]);
  stmt.free();
}

export function getArtists() {
  if (!db) return [];
  const res = db.exec("SELECT DISTINCT artist FROM tracks ORDER BY artist");
  if (res.length === 0) {
    return [];
  }
  return res[0].values.map((row) => row?.[0] as string);
}

export function getArtist(artistName: string): Artist | null {
  if (!db) return null;
  const stmt = db.prepare("SELECT name, imageUrl FROM artists WHERE name = ?");
  stmt.bind([artistName]);
  if (stmt.step()) {
    const result = stmt.getAsObject() as unknown as Artist;
    stmt.free();
    return result;
  }
  stmt.free();
  return null;
}

export function getAlbum(albumName: string, artistName: string): Album | null {
  if (!db) return null;
  const stmt = db.prepare(
    "SELECT name, artistName, imageUrl FROM albums WHERE name = ? AND artistName = ?"
  );
  stmt.bind([albumName, artistName]);
  if (stmt.step()) {
    const result = stmt.getAsObject() as unknown as Album;
    stmt.free();
    return result;
  }
  stmt.free();
  return null;
}

export function getAlbumsByArtist(artistName: string) {
  if (!db) return [];
  const stmt = db.prepare(
    "SELECT DISTINCT album FROM tracks WHERE artist = ? ORDER BY album"
  );
  stmt.bind([artistName]);
  const albums: string[] = [];
  while (stmt.step()) {
    albums.push(stmt.get()[0] as string);
  }
  stmt.free();
  return albums;
}

export function getTracksByAlbum(albumName: string) {
  if (!db) return [];
  const stmt = db.prepare(
    "SELECT title, artist, album, track FROM tracks WHERE album = ? ORDER BY CAST(track AS INTEGER)"
  );
  stmt.bind([albumName]);
  const tracks: Track[] = [];
  while (stmt.step()) {
    tracks.push(stmt.getAsObject() as unknown as Track);
  }
  stmt.free();
  return tracks;
}

export function exportDB(): Uint8Array | null {
  if (!db) return null;
  return db.export();
}

export async function restoreDB(data: Uint8Array) {
  const sql = await initializeSql();
  if (db) {
    db.close();
  }
  db = new sql.Database(data);
  await saveDbToIndexedDB();
}

export async function deleteDB() {
  if (db) {
    db.close();
    db = null;
  }
  return new Promise<void>((resolve, reject) => {
    const request = indexedDB.deleteDatabase(DB_NAME);
    request.onerror = () => reject("Error deleting database");
    request.onsuccess = () => resolve();
  });
}
