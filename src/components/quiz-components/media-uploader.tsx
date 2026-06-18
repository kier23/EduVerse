// quizzes/components/media-uploader.tsx
// Reusable media uploader for question attachments (image, audio, video, PDF).

import { useRef, useState } from "react";
import {
  Upload,
  X,
  FileText,
  Music,
  Film,
  Image as ImageIcon,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { uploadQuizMedia, type QuizQuestionMedia } from "@/lib/api/eduverse";

type MediaType = "image" | "audio" | "video" | "pdf" | "any";

const ACCEPT_MAP: Record<MediaType, string> = {
  image: "image/*",
  audio: "audio/*",
  video: "video/*",
  pdf: "application/pdf",
  any: "image/*,audio/*,video/*,application/pdf",
};

const ICON_MAP: Record<string, React.ElementType> = {
  image: ImageIcon,
  audio: Music,
  video: Film,
  pdf: FileText,
};

function getMediaCategory(mimeType: string): string {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("audio/")) return "audio";
  if (mimeType.startsWith("video/")) return "video";
  if (mimeType === "application/pdf") return "pdf";
  return "any";
}

interface MediaUploaderProps {
  quizId: string;
  questionId: string;
  existingMedia?: QuizQuestionMedia[];
  accept?: MediaType;
  label?: string;
  onUploaded?: (media: QuizQuestionMedia) => void;
  onRemove?: (mediaId: string) => void;
}

export function MediaUploader({
  quizId,
  questionId,
  existingMedia = [],
  accept = "any",
  label = "Attach media",
  onUploaded,
  onRemove,
}: MediaUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const handleFile = async (file: File) => {
    setUploading(true);
    try {
      const media = await uploadQuizMedia(quizId, questionId, file);
      onUploaded?.(media);
    } catch (err) {
      console.error("Media upload failed", err);
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  return (
    <div className="space-y-3">
      {/* Existing media previews */}
      {existingMedia.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {existingMedia.map((m) => (
            <MediaPreview
              key={m.id}
              media={m}
              onRemove={() => onRemove?.(m.id)}
            />
          ))}
        </div>
      )}

      {/* Drop zone */}
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        disabled={uploading}
        className={cn(
          "flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed py-6 text-sm transition-all",
          dragOver
            ? "border-amber-400/60 bg-amber-400/10"
            : "border-amber-500/15 bg-card/70 hover:border-amber-300/30 hover:bg-amber-400/10",
          uploading && "pointer-events-none opacity-60",
        )}
      >
        {uploading ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin text-amber-400" />
            <span className="text-xs text-muted-foreground">Uploading…</span>
          </>
        ) : (
          <>
            <Upload className="h-5 w-5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">
              {label} — click or drag & drop
            </span>
          </>
        )}
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT_MAP[accept]}
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
          }}
        />
      </button>
    </div>
  );
}

function MediaPreview({
  media,
  onRemove,
}: {
  media: QuizQuestionMedia;
  onRemove: () => void;
}) {
  const category = media.file_type ? getMediaCategory(media.file_type) : "any";
  const Icon = ICON_MAP[category] ?? FileText;

  return (
    <div className="group relative flex items-center gap-2 rounded-lg border border-amber-500/15 bg-card/90 px-3 py-2 text-xs text-foreground">
      {category === "image" && media.file_url ? (
        <img
          src={media.file_url}
          alt=""
          className="h-10 w-10 rounded object-cover border border-slate-200"
        />
      ) : (
        <div className="flex h-10 w-10 items-center justify-center rounded bg-card/70">
          <Icon className="h-5 w-5 text-muted-foreground" />
        </div>
      )}

      <div className="flex flex-col min-w-0">
        <span className="font-medium capitalize">{category}</span>
        {media.file_url && (
          <a
            href={media.file_url}
            target="_blank"
            rel="noreferrer"
            className="truncate text-amber-300 hover:text-amber-200 hover:underline max-w-35"
          >
            View file
          </a>
        )}
      </div>

      <button
        type="button"
        onClick={onRemove}
        className="ml-1 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-400 transition-all"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
