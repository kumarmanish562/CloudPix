"use client";
import { PhotoLibraryView } from "@/components/photos/photo-library-view";
export default function FavoritesPage() {
  return <PhotoLibraryView title="Favorites" description="Your favorite moments, together."
    status="ACTIVE" emptyTitle="Keep your favorites close" emptyDescription="Tap the heart on any photo to find it here."
    favoriteOnly showTrashAction />;
}

