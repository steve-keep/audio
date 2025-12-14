import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

test.beforeEach(async ({ page }) => {
  const dbPath = path.resolve('audio-indexer.db');
  const dbBuffer = fs.readFileSync(dbPath);
  const dbArray = Array.from(dbBuffer);

  await page.goto('http://localhost:3000/audio/settings');
  await page.evaluate(async (data) => {
    const dbName = 'audio-indexer-db';
    const request = indexedDB.open(dbName, 1);
    await new Promise<void>((resolve) => {
      request.onupgradeneeded = () => {
        const db = request.result;
        db.createObjectStore('database');
      };
      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction('database', 'readwrite');
        const store = transaction.objectStore('database');
        store.put(new Uint8Array(data), 'db');
        transaction.oncomplete = () => {
          db.close();
          resolve();
        };
      };
    });
  }, dbArray);
});

test('main page should display artists', async ({ page }) => {
  await page.goto('http://localhost:3000/audio');
  await page.waitForSelector('h1:has-text("Artists")');
  const artist = await page.locator('a > div > h3').first();
  await expect(artist).toBeVisible();
});

test('main page should display a placeholder for broken images', async ({ page }) => {
  await page.goto('http://localhost:3000/audio');
  await page.waitForSelector('h1:has-text("Artists")');
  const placeholder = await page.locator('img[data-testid="placeholder-image"]');
  await expect(placeholder.first()).toBeVisible();
});
