import { render, screen } from '@testing-library/react';
import Library from './page';
import { vi } from 'vitest';
import * as database from '../database';

vi.mock('../database');

describe('Library page', () => {
  it('should render the page and display the library stats', async () => {
    const mockedDatabase = vi.mocked(database);
    mockedDatabase.initDB.mockResolvedValue({} as any);
    mockedDatabase.getArtistCount.mockReturnValue(5);
    mockedDatabase.getAlbumCount.mockReturnValue(10);
    mockedDatabase.getTrackCount.mockReturnValue(50);

    render(<Library />);

    expect(screen.getByText('My Library')).toBeInTheDocument();

    expect(await screen.findByText('Artists')).toBeInTheDocument();
    expect(await screen.findByText('5 artists')).toBeInTheDocument();

    expect(await screen.findByText('Albums')).toBeInTheDocument();
    expect(await screen.findByText('10 albums')).toBeInTheDocument();

    expect(await screen.findByText('Tracks')).toBeInTheDocument();
    expect(await screen.findByText('50 tracks')).toBeInTheDocument();
  });
});
