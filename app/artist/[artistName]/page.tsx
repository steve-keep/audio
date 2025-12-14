import ArtistPage from "./client";

export async function generateStaticParams() {
  // Provide a dummy path to satisfy the static export requirements.
  return [{ artistName: "dummy" }];
}

export default function Page({ params }: { params: { artistName: string } }) {
  return <ArtistPage params={params} />;
}
