import { ClipLibrary } from "@/components/library/clip-library";

export default function LibraryPage() {
  return (
    <div className="flex-1 flex flex-col p-6">
      <div className="w-full space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Library</h1>
          <p className="text-muted-foreground mt-1">
            Your saved clips and compositions
          </p>
        </div>
        <ClipLibrary />
      </div>
    </div>
  );
}
