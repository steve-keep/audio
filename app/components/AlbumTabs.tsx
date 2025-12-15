"use client";

import { useState } from 'react';

interface AlbumTabsProps {
  allAlbums: React.ReactNode;
  libraryAlbums: React.ReactNode;
}

export default function AlbumTabs({ allAlbums, libraryAlbums }: AlbumTabsProps) {
  const [activeTab, setActiveTab] = useState('all');

  return (
    <div>
      <div className="album-tabs">
        <button onClick={() => setActiveTab('all')} className={activeTab === 'all' ? 'active' : ''}>
          All Albums
        </button>
        <button onClick={() => setActiveTab('library')} className={activeTab === 'library' ? 'active' : ''}>
          In Library
        </button>
      </div>
      <div>
        {activeTab === 'all' ? allAlbums : libraryAlbums}
      </div>
    </div>
  );
}
