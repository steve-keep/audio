import Link from "next/link";
import { type AlbumWithArtist } from "../database";
import LibraryIcon from "./icons/LibraryIcon";

interface AlbumListProps {
  albums: AlbumWithArtist[];
  showLibraryIcon?: (albumName: string) => boolean;
}

export default function AlbumList({ albums, showLibraryIcon }: AlbumListProps) {
  return (
    <div className="grid-container">
      {albums.map((album) => (
        <Link
          href={`/album#${encodeURIComponent(album.artistName)}/${encodeURIComponent(
            album.name
          )}`}
          key={`${album.artistName}-${album.name}`}
          className="grid-item"
        >
          {album.imageUrl && <img src={album.imageUrl} alt={album.name} />}
          <h3>
            {album.name}
            {showLibraryIcon && showLibraryIcon(album.name) && <LibraryIcon />}
          </h3>
        </Link>
      ))}
    </div>
  );
}
