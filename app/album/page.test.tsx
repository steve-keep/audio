import { render, screen, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import AlbumPage from './page';
import * as database from '../database';

vi.mock('../database', () => ({
  initDB: vi.fn().mockResolvedValue(undefined),
  getAlbum: vi.fn(),
  getTracksByAlbumAndArtist: vi.fn(),
}));

// Mock the LoadingSpinner component
vi.mock('../components/LoadingSpinner', () => ({
  default: () => <div data-testid="loading-spinner"></div>,
}));

describe('Album page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(window, 'location', {
      writable: true,
      value: {
        hash: '',
      },
    });
  });

  it('should render the album details and track list', async () => {
    const mockAlbum = { name: 'Album 1', artistName: 'Artist 1', imageUrl: 'http://example.com/album1.jpg' };
    const mockTracks = [
      { title: 'Track 1', artist: 'Artist 1', album: 'Album 1', track: '1' },
      { title: 'Track 2', artist: 'Artist 1', album: 'Album 1', track: '2' },
    ];
    (database.getAlbum as vi.Mock).mockReturnValue(mockAlbum);
    (database.getTracksByAlbumAndArtist as vi.Mock).mockReturnValue(mockTracks);

    window.location.hash = `#${encodeURIComponent('Artist 1 - Album 1')}`;

    render(<AlbumPage />);

    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
      // Check for album title
      expect(screen.getByRole('heading', { name: 'Album 1' })).toBeInTheDocument();

      // Check for artist name in the header
      expect(screen.getByText(mockAlbum.artistName, { selector: 'p' })).toBeInTheDocument();

      // Check for track titles
      expect(screen.getByText('Track 1')).toBeInTheDocument();
      expect(screen.getByText('Track 2')).toBeInTheDocument();

      // Check that the artist name appears for each track, plus once in the header
      expect(screen.getAllByText('Artist 1')).toHaveLength(mockTracks.length + 1);
    });
  });
});
