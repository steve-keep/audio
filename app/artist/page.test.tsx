
import { render, screen, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ArtistPage from './page';
import * as database from '../database';

// Mock the database module
vi.mock('../database', () => ({
  initDB: vi.fn().mockResolvedValue(undefined),
  getAlbumsByArtist: vi.fn(),
  getAlbum: vi.fn(),
  insertAlbum: vi.fn(),
}));

// Mock fetch
global.fetch = vi.fn();

describe('ArtistPage', () => {
  const mockArtistName = 'Test Artist';

  beforeEach(() => {
    // Clear all mocks before each test
    vi.clearAllMocks();
    (global.fetch as vi.Mock).mockClear();
    Object.defineProperty(window, 'location', {
      writable: true,
      value: {
        hash: '',
      },
    });
  });

  it('should render the artist name and a link back to the artists page', async () => {
    (database.getAlbumsByArtist as vi.Mock).mockReturnValue([]);
    window.location.hash = `#${mockArtistName}`;

    await act(async () => {
      render(<ArtistPage />);
    });

    await waitFor(() => {
      expect(screen.getByText(mockArtistName)).toBeInTheDocument();
    });
    expect(screen.getByText('Back to Artists')).toHaveAttribute('href', '/');
  });

  it('should fetch and display albums for the artist', async () => {
    const mockAlbums = ['Album 1', 'Album 2'];
    (database.getAlbumsByArtist as vi.Mock).mockReturnValue(mockAlbums);
    (database.getAlbum as vi.Mock).mockReturnValueOnce(null); // First time it's not in the DB
    (global.fetch as vi.Mock).mockResolvedValueOnce({
      json: () => Promise.resolve({ album: [{ strAlbumThumb: 'http://example.com/album1.jpg' }] }),
    });
    (database.getAlbum as vi.Mock).mockReturnValueOnce({ name: 'Album 2', artistName: mockArtistName, imageUrl: 'http://example.com/album2.jpg' }); // Second one is already in DB

    window.location.hash = `#${mockArtistName}`;

    await act(async () => {
      render(<ArtistPage />);
    });

    await waitFor(() => {
      expect(screen.getByText('Album 1')).toBeInTheDocument();
      expect(screen.getByAltText('Album 1')).toHaveAttribute('src', 'http://example.com/album1.jpg');
      expect(screen.getByText('Album 2')).toBeInTheDocument();
      expect(screen.getByAltText('Album 2')).toHaveAttribute('src', 'http://example.com/album2.jpg');
    });

    // Verify that the database was updated for the fetched album
    expect(database.insertAlbum).toHaveBeenCalledWith({
      name: 'Album 1',
      artistName: mockArtistName,
      imageUrl: 'http://example.com/album1.jpg',
    });
  });

  it('should display a placeholder image when fetching an image fails', async () => {
    const mockAlbums = ['Album 1'];
    (database.getAlbumsByArtist as vi.Mock).mockReturnValue(mockAlbums);
    (database.getAlbum as vi.Mock).mockReturnValue(null);
    (global.fetch as vi.Mock).mockRejectedValueOnce(new Error('API Error'));

    window.location.hash = `#${mockArtistName}`;

    await act(async () => {
      render(<ArtistPage />);
    });

    await waitFor(() => {
      expect(screen.getByText('Album 1')).toBeInTheDocument();
      const image = screen.getByAltText('Album 1');
      expect(image).toHaveAttribute('src', '/placeholder.svg');
      expect(image).toHaveAttribute('data-testid', 'placeholder-image');
    });
  });
});
