import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ArtistsPage from './page';
import * as database from '../database';

// Mock the database module
vi.mock('../database', () => ({
  initDB: vi.fn().mockResolvedValue(undefined),
  getArtists: vi.fn(),
  getArtist: vi.fn(),
  insertArtist: vi.fn(),
}));

// Mock fetch
global.fetch = vi.fn();

describe('Artists page integration test', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    vi.clearAllMocks();
    (global.fetch as vi.Mock).mockClear();
  });

  it('should render the main page with a list of artists', async () => {
    const mockArtists = [
      { id: 1, name: 'Artist 1', imageUrl: 'http://example.com/artist1.jpg' },
      { id: 2, name: 'Artist 2', imageUrl: null },
    ];
    (database.getArtists as vi.Mock).mockReturnValue(mockArtists);

    // Mock fetch for the second artist which has a null imageUrl
    (global.fetch as vi.Mock).mockResolvedValueOnce({
      json: () => Promise.resolve({ artists: [{ strArtistThumb: 'http://example.com/artist2.jpg' }] }),
    });

    render(<ArtistsPage />);

    // Wait for the artists to be displayed
    await waitFor(() => {
      expect(screen.getByText('Artist 1')).toBeInTheDocument();
      expect(screen.getByText('Artist 2')).toBeInTheDocument();
    });

    // Check that the images are displayed correctly
    expect(screen.getByAltText('Artist 1')).toHaveAttribute('src', 'http://example.com/artist1.jpg');
    expect(screen.getByAltText('Artist 2')).toHaveAttribute('src', 'http://example.com/artist2.jpg');
  });

  it('should display a placeholder image when fetching an image fails', async () => {
    const mockArtists = [{ id: 3, name: 'Artist 3', imageUrl: null }];
    (database.getArtists as vi.Mock).mockReturnValue(mockArtists);
    (global.fetch as vi.Mock).mockRejectedValueOnce(new Error('API Error'));

    render(<ArtistsPage />);

    await waitFor(() => {
      expect(screen.getByText('Artist 3')).toBeInTheDocument();
      const image = screen.getByAltText('Artist 3');
      expect(image).toHaveAttribute('src', '/placeholder.svg');
      expect(image).toHaveAttribute('data-testid', 'placeholder-image');
    });
  });
});
