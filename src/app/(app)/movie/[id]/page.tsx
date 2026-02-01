import { MovieEditor } from "@/components/movie/movie-editor";

export default async function MovieEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <MovieEditor movieId={id} />;
}
