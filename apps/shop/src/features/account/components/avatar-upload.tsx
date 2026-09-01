import { useRef } from 'react';
import { Camera, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { AuthUser } from '@plastimatic/shared';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ApiError } from '@/lib/api-client';
import { useUploadAvatar } from '../api/account-api';

/** Single-photo picker: clicking the avatar (or its camera badge) opens a
 *  file picker, and the selected file uploads and saves immediately, no
 *  separate form submit. */
export function AvatarUpload({ user }: { user: AuthUser }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const uploadAvatar = useUploadAvatar();

  const handleFile = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    try {
      await uploadAvatar.mutateAsync(file);
      toast.success('Photo de profil mise à jour');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Échec de l'envoi de la photo");
    } finally {
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <div className="flex items-center gap-4">
      <button
        type="button"
        className="group relative"
        onClick={() => inputRef.current?.click()}
        disabled={uploadAvatar.isPending}
        aria-label="Changer la photo de profil"
      >
        <Avatar className="h-16 w-16">
          <AvatarImage src={user.avatarUrl ?? undefined} />
          <AvatarFallback className="text-lg">
            {user.firstName[0]}
            {user.lastName[0]}
          </AvatarFallback>
        </Avatar>
        <span className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full border-2 border-background bg-primary text-primary-foreground transition-colors group-hover:bg-primary/90">
          {uploadAvatar.isPending ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Camera className="h-3 w-3" />
          )}
        </span>
      </button>
      <div className="text-sm text-muted-foreground">
        <p className="font-medium text-foreground">Photo de profil</p>
        <p>JPG, PNG, WEBP ou GIF — 5 Mo max.</p>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        hidden
        onChange={(e) => handleFile(e.target.files)}
      />
    </div>
  );
}
