import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import AlbumsPage from './page';
import * as database from '../database';

vi.mock('../database', () => ({
  initDB: vi.fn().mockResolvedValue(undefined),
  getAllAlbums: vi.fn(),
}));

describe('Albums page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render the page with a list of albums', async () => {
    const mockAlbums = [
      { name: 'Album 1', artistName: 'Artist 1', imageUrl: 'http://example.com/album1.jpg' },
      { name: 'Album 2', artistName: 'Artist 2', imageUrl: 'http://example.com/album2.jpg' },
    ];
    (database.getAllAlbums as vi.Mock).mockReturnValue(mockAlbums);

    render(<AlbumsPage />);

    await waitFor(() => {
      expect(screen.getByText('Album 1')).toBeInTheDocument();
      expect(screen.getByText('Artist 1')).toBeInTheDocument();
      expect(screen.getByText('Album 2')).toBeInTheDocument();
      expect(screen.getByText('Artist 2')).toBeInTheDocument();
    });
  });
});
