import { useRef } from 'react';
import { ImagePlus, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';
import { ApiError } from '@/lib/api-client';
import { useUploadImage } from '@/lib/uploads-api';

/** Thumbnail grid + file picker for a product's `images: string[]`. Each
 *  selected file is uploaded immediately; the returned URL is what actually
 *  gets stored on the product (the form never sends raw file bytes). */
export function ImageUploadField({ value, onChange }: { value: string[]; onChange: (urls: string[]) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const uploadImage = useUploadImage();

  const handleFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    const uploaded: string[] = [];
    for (const file of Array.from(files)) {
      try {
        const { url } = await uploadImage.mutateAsync(file);
        uploaded.push(url);
      } catch (err) {
        toast.error(err instanceof ApiError ? err.message : `Échec de l'envoi de ${file.name}`);
      }
    }
    if (uploaded.length) onChange([...value, ...uploaded]);
    if (inputRef.current) inputRef.current.value = '';
  };

  const removeAt = (index: number) => onChange(value.filter((_, i) => i !== index));

  return (
    <div>
      <div className="flex flex-wrap gap-3">
        {value.map((url, index) => (
          <div key={url} className="group relative h-20 w-20 overflow-hidden rounded-md border">
            <img src={url} alt="" className="h-full w-full object-cover" />
            <button
              type="button"
              onClick={() => removeAt(index)}
              className="absolute right-1 top-1 rounded-full bg-background/90 p-0.5 opacity-0 shadow transition-opacity group-hover:opacity-100"
            >
              <X className="h-3.5 w-3.5" />
            </button>
            {index === 0 && (
              <span className="absolute bottom-0 left-0 right-0 bg-background/90 py-0.5 text-center text-[10px] font-medium">
                Principale
              </span>
            )}
          </div>
        ))}

        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploadImage.isPending}
          className="flex h-20 w-20 flex-col items-center justify-center gap-1 rounded-md border border-dashed text-muted-foreground transition-colors hover:border-primary hover:text-primary disabled:opacity-50"
        >
          {uploadImage.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <ImagePlus className="h-5 w-5" />}
          <span className="text-[10px]">Ajouter</span>
        </button>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        multiple
        hidden
        onChange={(e) => handleFiles(e.target.files)}
      />
      <p className="mt-1.5 text-xs text-muted-foreground">JPG, PNG, WEBP ou GIF — 5 Mo max par image.</p>
    </div>
  );
}
