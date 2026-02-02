import { MovieList } from "@/components/movie/movie-list";

export default function MoviePage() {
  return (
    <div className="flex-1 flex flex-col p-6">
      <div className="w-full space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Movies</h1>
          <p className="text-muted-foreground mt-1">
            Your multi-scene movie projects
          </p>
        </div>
        <MovieList />
      </div>
    </div>
  );
}
