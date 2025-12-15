import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import TracksPage from './page';
import * as database from '../database';

vi.mock('../database', () => ({
  initDB: vi.fn().mockResolvedValue(undefined),
  getAllTracks: vi.fn(),
}));

describe('Tracks page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render the page with a list of tracks', async () => {
    const mockTracks = [
      { title: 'Track 1', artist: 'Artist 1', album: 'Album 1', track: '1' },
      { title: 'Track 2', artist: 'Artist 2', album: 'Album 2', track: '2' },
    ];
    (database.getAllTracks as vi.Mock).mockReturnValue(mockTracks);

    render(<TracksPage />);

    await waitFor(() => {
      expect(screen.getByText('Track 1')).toBeInTheDocument();
      expect(screen.getByText('Artist 1')).toBeInTheDocument();
      expect(screen.getByText('Album 1 - Track 1')).toBeInTheDocument();
      expect(screen.getByText('Track 2')).toBeInTheDocument();
      expect(screen.getByText('Artist 2')).toBeInTheDocument();
      expect(screen.getByText('Album 2 - Track 2')).toBeInTheDocument();
    });
  });
});
