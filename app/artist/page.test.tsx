import { render, screen, waitFor, act, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React, { useState } from 'react';
import ArtistPage from './page';
import * as database from '../database';

// Mock the database module
vi.mock('../database', () => ({
  initDB: vi.fn().mockResolvedValue(undefined),
  getAlbumsByArtist: vi.fn(),
  getAlbum: vi.fn(),
  insertAlbum: vi.fn(),
  getArtist: vi.fn(),
}));

// Mock child components to isolate the page component
vi.mock('../components/ArtistHeader', () => ({
  default: ({ artistName, artistImageUrl }: { artistName: string; artistImageUrl: string }) => (
    <div data-testid="artist-header">
      <h1>{artistName}</h1>
      <img src={artistImageUrl} alt={artistName} />
    </div>
  ),
}));

vi.mock('../components/AlbumTabs', () => ({
    default: ({ allAlbums, libraryAlbums }: { allAlbums: React.ReactNode; libraryAlbums: React.ReactNode }) => {
    const [activeTab, setActiveTab] = useState('all');
    return (
      <div data-testid="album-tabs">
        <button onClick={() => setActiveTab('all')}>All Albums</button>
        <button onClick={() => setActiveTab('library')}>In Library</button>
        <div data-testid="tab-content">
            {activeTab === 'all' ? allAlbums : libraryAlbums}
        </div>
      </div>
    );
  },
}));

vi.mock('../components/AlbumList', () => ({
  default: ({ albums }: { albums: database.Album[] }) => (
    <div data-testid="album-list">
      {albums.map(album => <div key={album.name}>{album.name}</div>)}
    </div>
  ),
}));

// Mock fetch
global.fetch = vi.fn();

// Mock localStorage
const localStorageMock = (() => {
  let store: { [key: string]: string } = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    clear: () => {
      store = {};
    },
    removeItem: (key: string) => {
      delete store[key];
    }
  };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

describe('ArtistPage', () => {
  const mockArtistName = 'Test Artist';
  const mockArtist = { id: 1, name: mockArtistName, imageUrl: 'http://example.com/artist.jpg' };
  const mockLibraryAlbums = [
    { id: 1, name: 'Library Album', artist_id: 1, imageUrl: 'http://example.com/lib.jpg' },
  ];
  const mockApiAlbums = [
    { strAlbum: 'Library Album', strAlbumThumb: 'http://example.com/lib.jpg' },
    { strAlbum: 'API Album', strAlbumThumb: 'http://example.com/api.jpg' },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    (global.fetch as vi.Mock).mockClear();
    localStorageMock.clear();
    Object.defineProperty(window, 'location', {
      writable: true,
      value: { hash: `#${mockArtistName}` },
    });

    // Default Mocks
    (database.getArtist as vi.Mock).mockReturnValue(mockArtist);
    (database.getAlbumsByArtist as vi.Mock).mockReturnValue(mockLibraryAlbums);

    (global.fetch as vi.Mock).mockResolvedValue({
      json: () => Promise.resolve({ album: mockApiAlbums }),
    });
  });

  it('should render loading state initially, then artist details and albums', async () => {
    render(<ArtistPage />);

    expect(screen.getByText('Loading...')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByTestId('artist-header')).toBeInTheDocument();
      expect(screen.getByText(mockArtistName)).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByText('API Album')).toBeInTheDocument();
      expect(screen.getAllByText('Library Album').length).toBeGreaterThan(0);
    });
  });

  it('should switch to the "In Library" tab and show only local albums', async () => {
    render(<ArtistPage />);

    await waitFor(() => {
      expect(screen.getByText('API Album')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('In Library'));

    await waitFor(() => {
      expect(screen.queryByText('API Album')).not.toBeInTheDocument();
      expect(screen.getByText('Library Album')).toBeInTheDocument();
    });
  });

  it('should use cached album data if available and not expired', async () => {
    const cachedData = {
      timestamp: Date.now(),
      data: [{ name: 'Cached Album', artistName: mockArtistName, imageUrl: 'http://example.com/cached.jpg' }],
    };
    localStorageMock.setItem(`artist-albums-${mockArtistName}`, JSON.stringify(cachedData));

    render(<ArtistPage />);

    await waitFor(() => {
      expect(screen.getByText('Cached Album')).toBeInTheDocument();
    });

    expect(global.fetch).not.toHaveBeenCalledWith(expect.stringContaining('searchalbum.php'));
  });
});
