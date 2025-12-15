"use client";

import { useState, useEffect, useRef } from 'react';

interface ArtistHeaderProps {
  artistName: string;
  artistImageUrl: string;
}

export default function ArtistHeader({ artistName, artistImageUrl }: ArtistHeaderProps) {
  const [isSticky, setIsSticky] = useState(false);
  const headerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      if (headerRef.current) {
        const { top } = headerRef.current.getBoundingClientRect();
        setIsSticky(top <= 0);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  return (
    <>
      <div ref={headerRef} className="artist-header">
        <img src={artistImageUrl} alt={artistName} className="artist-header-image" />
        <h1 className="artist-header-name">{artistName}</h1>
      </div>
      <div className={`sticky-header ${isSticky ? 'visible' : ''}`}>
        <h2>{artistName}</h2>
      </div>
    </>
  );
}
