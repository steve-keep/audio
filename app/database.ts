import initSqlJs, { Database, SqlJsStatic } from "sql.js";

let db: Database | null = null;
let SQL: SqlJsStatic | null = null;

const DB_NAME = "audio-indexer-db";
const DB_STORE_NAME = "database";
const DIRECTORY_HANDLE_STORE_NAME = "directoryHandle";

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
      if (!db.objectStoreNames.contains(DB_STORE_NAME)) {
        db.createObjectStore(DB_STORE_NAME);
      }
      if (!db.objectStoreNames.contains(DIRECTORY_HANDLE_STORE_NAME)) {
        db.createObjectStore(DIRECTORY_HANDLE_STORE_NAME);
      }
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

export async function clearDirectoryHandle() {
  const idb = await openIndexedDB();
  const transaction = idb.transaction(DIRECTORY_HANDLE_STORE_NAME, "readwrite");
  const store = transaction.objectStore(DIRECTORY_HANDLE_STORE_NAME);
  store.delete("directoryHandle");
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
    CREATE TABLE IF NOT EXISTS artists (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE,
      imageUrl TEXT
    );
    CREATE TABLE IF NOT EXISTS albums (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      artist_id INTEGER,
      imageUrl TEXT,
      FOREIGN KEY(artist_id) REFERENCES artists(id),
      UNIQUE(name, artist_id)
    );
    CREATE TABLE IF NOT EXISTS tracks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT,
      track TEXT,
      path TEXT UNIQUE,
      lastModified INTEGER,
      size INTEGER,
      album_id INTEGER,
      artist_id INTEGER,
      FOREIGN KEY(album_id) REFERENCES albums(id),
      FOREIGN KEY(artist_id) REFERENCES artists(id)
    );
  `;
  db.run(query);
}

export interface Track {
  id: number;
  title: string;
  track: string;
  album_id: number;
  artist_id: number;
}

export interface Artist {
  id: number;
  name: string;
  imageUrl: string;
}

export interface Album {
  id: number;
  name: string;
  artist_id: number;
  imageUrl: string;
}

export interface RawTrack {
  title: string;
  artist: string;
  album: string;
  track: string;
  path: string;
  lastModified: number;
  size: number;
}

function getOrInsertArtistId(artistName: string): number {
  if (!db) throw new Error("Database not initialized");

  const selectStmt = db.prepare("SELECT id FROM artists WHERE name = ?");
  selectStmt.bind([artistName]);
  if (selectStmt.step()) {
    const id = selectStmt.get()[0] as number;
    selectStmt.free();
    return id;
  }
  selectStmt.free();

  const insertStmt = db.prepare("INSERT INTO artists (name) VALUES (?)");
  insertStmt.run([artistName]);
  insertStmt.free();

  const lastId = db.exec("SELECT last_insert_rowid()")[0].values[0][0] as number;
  return lastId;
}

function getOrInsertAlbumId(albumName: string, artistId: number): number {
  if (!db) throw new Error("Database not initialized");

  const selectStmt = db.prepare("SELECT id FROM albums WHERE name = ? AND artist_id = ?");
  selectStmt.bind([albumName, artistId]);
  if (selectStmt.step()) {
    const id = selectStmt.get()[0] as number;
    selectStmt.free();
    return id;
  }
  selectStmt.free();

  const insertStmt = db.prepare("INSERT INTO albums (name, artist_id) VALUES (?, ?)");
  insertStmt.run([albumName, artistId]);
  insertStmt.free();

  const lastId = db.exec("SELECT last_insert_rowid()")[0].values[0][0] as number;
  return lastId;
}


export function insertTrack(track: RawTrack) {
  if (!db) return;

  const artistId = getOrInsertArtistId(track.artist);
  const albumId = getOrInsertAlbumId(track.album, artistId);

  const stmt = db.prepare(
    "INSERT INTO tracks (title, track, path, lastModified, size, album_id, artist_id) VALUES (?, ?, ?, ?, ?, ?, ?)"
  );
  stmt.run([track.title, track.track, track.path, track.lastModified, track.size, albumId, artistId]);
  stmt.free();
}

export function bulkInsertTracks(tracks: RawTrack[]) {
  if (!db) return;

  db.exec("BEGIN TRANSACTION");
  try {
    const stmt = db.prepare(
      "INSERT OR IGNORE INTO tracks (title, track, path, lastModified, size, album_id, artist_id) VALUES (?, ?, ?, ?, ?, ?, ?)"
    );

    for (const track of tracks) {
      const artistId = getOrInsertArtistId(track.artist);
      const albumId = getOrInsertAlbumId(track.album, artistId);
      stmt.run([track.title, track.track, track.path, track.lastModified, track.size, albumId, artistId]);
    }

    stmt.free();
    db.exec("COMMIT");
  } catch (e) {
    console.error("Bulk insert failed, rolling back.", e);
    db.exec("ROLLBACK");
    throw e;
  }
}

export function deleteTrackByPath(path: string) {
  if (!db) return;

  const stmt = db.prepare("DELETE FROM tracks WHERE path = ?");
  stmt.run([path]);
  stmt.free();
}

export function insertArtist(artist: { name: string, imageUrl: string }) {
  if (!db) return;
  const stmt = db.prepare(
    "UPDATE artists SET imageUrl = ? WHERE name = ?"
  );
  stmt.run([artist.imageUrl, artist.name]);
  stmt.free();
}

export function insertAlbum(album: { name: string, artistName: string, imageUrl: string }) {
  if (!db) return;
  const artistStmt = db.prepare("SELECT id FROM artists WHERE name = ?");
  artistStmt.bind([album.artistName]);
  if (!artistStmt.step()) {
    artistStmt.free();
    return; // Artist not found
  }
  const artistId = artistStmt.get()[0] as number;
  artistStmt.free();

  const albumStmt = db.prepare(
    "UPDATE albums SET imageUrl = ? WHERE name = ? AND artist_id = ?"
  );
  albumStmt.run([album.imageUrl, album.name, artistId]);
  albumStmt.free();
}

export interface AlbumWithArtist extends Album {
  artistName: string;
}

export interface TrackWithAlbumAndArtist extends Track {
  artistName: string;
  albumName: string;
}

export function getArtists(): Artist[] {
  if (!db) return [];
  const stmt = db.prepare("SELECT id, name, imageUrl FROM artists ORDER BY name");
  const artists: Artist[] = [];
  while (stmt.step()) {
    artists.push(stmt.getAsObject() as unknown as Artist);
  }
  stmt.free();
  return artists;
}

export function getArtist(artistName: string): Artist | null {
  if (!db) return null;
  const stmt = db.prepare("SELECT id, name, imageUrl FROM artists WHERE name = ?");
  stmt.bind([artistName]);
  if (stmt.step()) {
    const result = stmt.getAsObject() as unknown as Artist;
    stmt.free();
    return result;
  }
  stmt.free();
  return null;
}

export function getAlbum(albumName: string, artistName: string): AlbumWithArtist | null {
  if (!db) return null;
  const stmt = db.prepare(`
      SELECT a.id, a.name, a.artist_id, a.imageUrl, r.name as artistName
      FROM albums a
      JOIN artists r ON a.artist_id = r.id
      WHERE a.name = ? AND r.name = ?
  `);
  stmt.bind([albumName, artistName]);
  if (stmt.step()) {
      const result = stmt.getAsObject() as unknown as AlbumWithArtist;
      stmt.free();
      return result;
  }
  stmt.free();
  return null;
}

export function getAlbumsByArtist(artistName: string): AlbumWithArtist[] {
  if (!db) return [];
  const stmt = db.prepare(
    `SELECT a.id, a.name, a.artist_id, a.imageUrl, r.name as artistName
     FROM albums a
     JOIN artists r ON a.artist_id = r.id
     WHERE r.name = ?
     ORDER BY a.name`
  );
  stmt.bind([artistName]);
  const albums: AlbumWithArtist[] = [];
  while (stmt.step()) {
    albums.push(stmt.getAsObject() as unknown as AlbumWithArtist);
  }
  stmt.free();
  return albums;
}

export function getTracksByAlbumAndArtist(albumName: string, artistName: string): TrackWithAlbumAndArtist[] {
  if (!db) return [];
  const stmt = db.prepare(`
      SELECT t.id, t.title, t.track, t.album_id, t.artist_id, r.name as artistName, a.name as albumName
      FROM tracks t
      JOIN artists r ON t.artist_id = r.id
      JOIN albums a ON t.album_id = a.id
      WHERE a.name = ? AND r.name = ?
      ORDER BY CAST(t.track AS INTEGER)
  `);
  stmt.bind([albumName, artistName]);
  const tracks: TrackWithAlbumAndArtist[] = [];
  while (stmt.step()) {
      tracks.push(stmt.getAsObject() as unknown as TrackWithAlbumAndArtist);
  }
  stmt.free();
  return tracks;
}

export function getAllAlbums(): AlbumWithArtist[] {
  if (!db) return [];
  const stmt = db.prepare(`
      SELECT a.id, a.name, a.artist_id, a.imageUrl, r.name as artistName
      FROM albums a
      JOIN artists r ON a.artist_id = r.id
      ORDER BY a.name
  `);
  const albums: AlbumWithArtist[] = [];
  while (stmt.step()) {
      albums.push(stmt.getAsObject() as unknown as AlbumWithArtist);
  }
  stmt.free();
  return albums;
}

export function getAllTracks(): TrackWithAlbumAndArtist[] {
  if (!db) return [];
  const stmt = db.prepare(`
      SELECT t.id, t.title, t.track, t.album_id, t.artist_id, r.name as artistName, a.name as albumName
      FROM tracks t
      JOIN artists r ON t.artist_id = r.id
      JOIN albums a ON t.album_id = a.id
      ORDER BY r.name, a.name, CAST(t.track AS INTEGER)
  `);
  const tracks: TrackWithAlbumAndArtist[] = [];
  while (stmt.step()) {
      tracks.push(stmt.getAsObject() as unknown as TrackWithAlbumAndArtist);
  }
  stmt.free();
  return tracks;
}

export function getAllTrackPaths(): Set<string> {
  if (!db) return new Set();
  const stmt = db.prepare("SELECT path FROM tracks");
  const paths = new Set<string>();
  while (stmt.step()) {
    paths.add(stmt.get()[0] as string);
  }
  stmt.free();
  return paths;
}

export interface TrackIndex {
  [path: string]: {
    lastModified: number;
    size: number;
  };
}

export function getTrackIndex(): TrackIndex {
  if (!db) return {};
  const stmt = db.prepare("SELECT path, lastModified, size FROM tracks");
  const index: TrackIndex = {};
  while (stmt.step()) {
    const row = stmt.get();
    const path = row[0] as string;
    const lastModified = row[1] as number;
    const size = row[2] as number;
    index[path] = { lastModified, size };
  }
  stmt.free();
  return index;
}

export function getArtistCount(): number {
  if (!db) return 0;
  const res = db.exec("SELECT COUNT(*) FROM artists");
  if (res.length === 0 || !res[0].values[0]) {
    return 0;
  }
  return res[0].values[0][0] as number;
}

export function getAlbumCount(): number {
  if (!db) return 0;
  const res = db.exec("SELECT COUNT(*) FROM albums");
  if (res.length === 0 || !res[0].values[0]) {
    return 0;
  }
  return res[0].values[0][0] as number;
}

export function getTrackCount(): number {
  if (!db) return 0;
  const res = db.exec("SELECT COUNT(*) FROM tracks");
  if (res.length === 0 || !res[0].values[0]) {
    return 0;
  }
  return res[0].values[0][0] as number;
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

export async function saveDirectoryHandle(
  directoryHandle: FileSystemDirectoryHandle
) {
  const idb = await openIndexedDB();
  const transaction = idb.transaction(DIRECTORY_HANDLE_STORE_NAME, "readwrite");
  const store = transaction.objectStore(DIRECTORY_HANDLE_STORE_NAME);
  store.put(directoryHandle, "directoryHandle");
}

export async function getDirectoryHandle(): Promise<FileSystemDirectoryHandle | null> {
  const idb = await openIndexedDB();
  return new Promise((resolve, reject) => {
    const transaction = idb.transaction(DIRECTORY_HANDLE_STORE_NAME, "readonly");
    const store = transaction.objectStore(DIRECTORY_HANDLE_STORE_NAME);
    const request = store.get("directoryHandle");
    request.onerror = () => reject("Error loading directory handle from IndexedDB");
    request.onsuccess = () => resolve(request.result);
  });
}
