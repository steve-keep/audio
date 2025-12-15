import { render, screen, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import AlbumPage from './page';
import * as database from '../database';

// Mock the database module
vi.mock('../database', () => ({
  initDB: vi.fn().mockResolvedValue(undefined),
  getTracksByAlbumAndArtist: vi.fn(),
  getAlbum: vi.fn(),
  insertAlbum: vi.fn(),
}));

// Mock fetch
global.fetch = vi.fn();

describe('AlbumPage', () => {
  const mockArtistName = 'Test Artist';
  const mockAlbumName = 'Test Album';
  const mockAlbum = { name: mockAlbumName, artistName: mockArtistName, imageUrl: 'http://example.com/album.jpg' };
  const mockTracks = [
    { track: '1', title: 'Track 1' },
    { track: '2', title: 'Track 2' },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    (global.fetch as vi.Mock).mockClear();
    Object.defineProperty(window, 'location', {
      writable: true,
      value: { hash: `#${mockArtistName}/${mockAlbumName}` },
    });

    // Default Mocks
    (database.getTracksByAlbumAndArtist as vi.Mock).mockReturnValue(mockTracks);
    (database.getAlbum as vi.Mock).mockReturnValue(mockAlbum);
  });

  it('should call getTracksByAlbumAndArtist with the correct artist and album', async () => {
    await act(async () => {
      render(<AlbumPage />);
    });

    await waitFor(() => {
      expect(database.getTracksByAlbumAndArtist).toHaveBeenCalledWith(mockAlbumName, mockArtistName);
    });
  });

  it('should render album details and track list correctly', async () => {
    await act(async () => {
      render(<AlbumPage />);
    });

    await waitFor(() => {
      expect(screen.getByText(mockAlbumName)).toBeInTheDocument();
      expect(screen.getByText(mockArtistName)).toBeInTheDocument();
      expect(screen.getByAltText(mockAlbumName)).toHaveAttribute('src', mockAlbum.imageUrl);
      expect(screen.getByText('1. Track 1')).toBeInTheDocument();
      expect(screen.getByText('2. Track 2')).toBeInTheDocument();
    });
  });

  it('should fetch album art from API if not in local DB', async () => {
    (database.getAlbum as vi.Mock).mockReturnValue(null); // Not in DB
    (global.fetch as vi.Mock).mockResolvedValueOnce({
        json: () => Promise.resolve({ album: [{ strAlbumThumb: 'http://example.com/api.jpg' }] }),
    });

    await act(async () => {
        render(<AlbumPage />);
    });

    await waitFor(() => {
      expect(screen.getByAltText(mockAlbumName)).toHaveAttribute('src', 'http://example.com/api.jpg');
    });

    expect(database.insertAlbum).toHaveBeenCalledWith({
      name: mockAlbumName,
      artistName: mockArtistName,
      imageUrl: 'http://example.com/api.jpg',
    });
  });
});
