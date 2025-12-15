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

// Mock the LoadingSpinner component
vi.mock('../components/LoadingSpinner', () => ({
  default: () => <div data-testid="loading-spinner"></div>,
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
    const mockArtists = ['Artist 1', 'Artist 2'];
    (database.getArtists as vi.Mock).mockReturnValue(mockArtists);

    // Mock getArtist to return a valid artist object for the first artist
    (database.getArtist as vi.Mock).mockImplementation((name) => {
        if (name === 'Artist 1') {
            return { name: 'Artist 1', imageUrl: 'http://example.com/artist1.jpg' };
        }
        return null;
    });


    // Mock fetch for the second artist
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

  it('should show a loading spinner while fetching data', async () => {
    (database.getArtists as vi.Mock).mockReturnValue(['Artist 1']);
    (database.getArtist as vi.Mock).mockReturnValue({ name: 'Artist 1', imageUrl: 'http://example.com/artist1.jpg' });

    render(<ArtistsPage />);

    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
    });
  });

  it('should display a placeholder image when fetching an image fails', async () => {
    const mockArtists = ['Artist 3'];
    (database.getArtists as vi.Mock).mockReturnValue(mockArtists);
    (database.getArtist as vi.Mock).mockReturnValue(null);
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
