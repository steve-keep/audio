"use client";

import ChevronLeftIcon from "./icons/ChevronLeftIcon";

interface ArtistHeaderProps {
  artistName: string;
  artistImageUrl: string;
}

export default function ArtistHeader({ artistName, artistImageUrl }: ArtistHeaderProps) {
  const goBack = () => {
    window.history.back();
  };

  return (
    <div className="artist-header">
      <button onClick={goBack} className="back-button">
        <ChevronLeftIcon />
      </button>
      <img src={artistImageUrl} alt={artistName} className="artist-header-image" />
      <div className="artist-header-overlay">
        <h1 className="artist-header-name">{artistName}</h1>
      </div>
    </div>
  );
}
