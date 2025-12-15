
import { render, screen, waitFor, act } from '@testing-library/react';
import ArtistPage from './client';
import * as database from '../../database';

// Mock the database module
jest.mock('../../database', () => ({
  initDB: jest.fn().mockResolvedValue(undefined),
  getAlbumsByArtist: jest.fn(),
  getAlbum: jest.fn(),
  insertAlbum: jest.fn(),
}));

// Mock fetch
global.fetch = jest.fn();

describe('ArtistPage', () => {
  const mockArtistName = 'Test Artist';

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockClear();
  });

  it('should render the artist name and a link back to the artists page', async () => {
    (database.getAlbumsByArtist as jest.Mock).mockReturnValue([]);
    await act(async () => {
      render(<ArtistPage params={{ artistName: mockArtistName }} />);
    });

    expect(screen.getByText(mockArtistName)).toBeInTheDocument();
    expect(screen.getByText('Back to Artists')).toHaveAttribute('href', '/');
  });

  it('should fetch and display albums for the artist', async () => {
    const mockAlbums = ['Album 1', 'Album 2'];
    const mockAlbumData = { name: 'Album 1', artistName: mockArtistName, imageUrl: 'http://example.com/album1.jpg' };

    (database.getAlbumsByArtist as jest.Mock).mockReturnValue(mockAlbums);
    (database.getAlbum as jest.Mock).mockReturnValueOnce(null); // First time it's not in the DB
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      json: () => Promise.resolve({ album: [{ strAlbumThumb: 'http://example.com/album1.jpg' }] }),
    });
    (database.getAlbum as jest.Mock).mockReturnValueOnce({ name: 'Album 2', artistName: mockArtistName, imageUrl: 'http://example.com/album2.jpg' }); // Second one is already in DB

    await act(async () => {
      render(<ArtistPage params={{ artistName: mockArtistName }} />);
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
    (database.getAlbumsByArtist as jest.Mock).mockReturnValue(mockAlbums);
    (database.getAlbum as jest.Mock).mockReturnValue(null);
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('API Error'));

    await act(async () => {
      render(<ArtistPage params={{ artistName: mockArtistName }} />);
    });

    await waitFor(() => {
      expect(screen.getByText('Album 1')).toBeInTheDocument();
      const image = screen.getByAltText('Album 1');
      expect(image).toHaveAttribute('src', '/placeholder.svg');
      expect(image).toHaveAttribute('data-testid', 'placeholder-image');
    });
  });
});
