"use client";

import { useState, useRef, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface Photo {
  id: string;
  thumbnailData: string | null;
  caption: string | null;
  createdAt: string;
}

export function PhotoGallery({
  photos,
  canUpload,
  onUpload,
  onDelete,
  onLoadFull,
}: {
  photos: Photo[];
  canUpload: boolean;
  onUpload: (imageData: string, thumbnailData: string, caption?: string) => Promise<void>;
  onDelete: (photoId: string) => Promise<void>;
  onLoadFull: (photoId: string) => Promise<string>;
}) {
  const [uploading, setUploading] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<{ id: string; imageData: string; caption: string | null } | null>(null);
  const [caption, setCaption] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const resizeImage = useCallback((file: File, maxWidth: number, quality: number): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const ratio = Math.min(maxWidth / img.width, maxWidth / img.height);
          canvas.width = ratio < 1 ? img.width * ratio : img.width;
          canvas.height = ratio < 1 ? img.height * ratio : img.height;
          const ctx = canvas.getContext("2d")!;
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL("image/jpeg", quality));
        };
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  }, []);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const imageData = await resizeImage(file, 1600, 0.8);
        const thumbnailData = await resizeImage(file, 300, 0.6);
        await onUpload(imageData, thumbnailData, caption || undefined);
      }
      setCaption("");
      if (fileRef.current) fileRef.current.value = "";
    } finally {
      setUploading(false);
    }
  };

  const openPhoto = async (photo: Photo) => {
    const fullData = await onLoadFull(photo.id);
    setSelectedPhoto({ id: photo.id, imageData: fullData, caption: photo.caption });
  };

  return (
    <div className="space-y-4">
      {/* Upload section */}
      {canUpload && (
        <Card className="py-4 px-5">
          <div className="flex items-center gap-3">
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileSelect}
              className="hidden"
            />
            <Button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              size="sm"
              className="gap-1.5"
            >
              {uploading ? "A enviar..." : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Adicionar Fotos
                </>
              )}
            </Button>
            <input
              type="text"
              placeholder="Legenda (opcional)"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              className="flex-1 text-sm rounded-md border border-border bg-surface px-3 py-1.5 placeholder:text-text-muted"
            />
          </div>
        </Card>
      )}

      {/* Photo grid */}
      {photos.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          {photos.map((photo) => (
            <div
              key={photo.id}
              className="relative aspect-square rounded-lg overflow-hidden cursor-pointer group border border-border hover:border-primary transition-colors"
              onClick={() => openPhoto(photo)}
            >
              {photo.thumbnailData ? (
                <img
                  src={photo.thumbnailData}
                  alt={photo.caption || "Foto do torneio"}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-surface-alt flex items-center justify-center">
                  <svg className="w-8 h-8 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              )}
              {photo.caption && (
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-[11px] text-white">{photo.caption}</span>
                </div>
              )}
              {canUpload && (
                <button
                  onClick={(e) => { e.stopPropagation(); onDelete(photo.id); }}
                  className="absolute top-1 right-1 bg-black/50 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-xs hover:bg-red-600"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>
      ) : (
        <Card className="py-8 px-5 text-center">
          <svg className="w-10 h-10 text-text-muted mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <p className="text-sm text-text-muted">Ainda não há fotos neste torneio.</p>
        </Card>
      )}

      {/* Lightbox */}
      {selectedPhoto && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedPhoto(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
            <img
              src={selectedPhoto.imageData}
              alt={selectedPhoto.caption || "Foto"}
              className="max-w-full max-h-[85vh] object-contain rounded-lg"
            />
            {selectedPhoto.caption && (
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4 rounded-b-lg">
                <p className="text-white text-sm">{selectedPhoto.caption}</p>
              </div>
            )}
            <button
              onClick={() => setSelectedPhoto(null)}
              className="absolute top-2 right-2 bg-black/50 text-white rounded-full w-8 h-8 flex items-center justify-center hover:bg-black/80"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
