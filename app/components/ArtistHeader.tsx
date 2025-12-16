interface ArtistHeaderProps {
  artistName: string;
  artistImageUrl: string;
}

export default function ArtistHeader({ artistName, artistImageUrl }: ArtistHeaderProps) {
  return (
    <>
      <div className="artist-header">
        <img src={artistImageUrl} alt={artistName} className="artist-header-image" />
        <h1 className="artist-header-name">{artistName}</h1>
      </div>
      <div className="sticky-header">
        <h2>{artistName}</h2>
      </div>
    </>
  );
}
