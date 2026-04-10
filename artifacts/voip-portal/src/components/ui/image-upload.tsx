import { useRef, useState, useCallback } from "react";
import { Upload, X, ImageIcon, Loader2 } from "lucide-react";

interface ImageUploadProps {
  value: string;
  onChange: (url: string) => void;
  label?: string;
}

/** Convert an objectPath (e.g. /objects/uploads/uuid) to a serving URL */
export function getImageSrc(url: string): string {
  if (!url) return "";
  if (url.startsWith("/objects/")) return `/api/storage${url}`;
  return url;
}

export function ImageUpload({ value, onChange, label = "Product Image" }: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [urlInput, setUrlInput] = useState(value.startsWith("/objects/") ? "" : value);

  const uploadFile = useCallback(async (file: File) => {
    if (!file.type.startsWith("image/")) return;
    setIsUploading(true);
    setProgress(10);
    try {
      const formData = new FormData();
      formData.append("file", file);
      setProgress(30);
      const res = await fetch("/api/storage/upload", { method: "POST", body: formData });
      setProgress(90);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Upload failed");
      }
      const data = await res.json();
      onChange(data.objectPath);
      setUrlInput("");
      setProgress(100);
    } catch (err) {
      console.error("Image upload failed:", err);
    } finally {
      setIsUploading(false);
    }
  }, [onChange]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) uploadFile(file);
  }, [uploadFile]);

  const handleUrlBlur = () => {
    if (urlInput.trim()) {
      onChange(urlInput.trim());
    }
  };

  const handleClear = () => {
    onChange("");
    setUrlInput("");
    if (inputRef.current) inputRef.current.value = "";
  };

  const previewSrc = value ? getImageSrc(value) : "";

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-muted-foreground">{label}</label>

      {/* Preview / Upload zone */}
      <div
        className={`relative rounded-xl border-2 border-dashed transition-all overflow-hidden ${
          isDragging ? "border-primary bg-primary/5 scale-[1.01]" : "border-border/60 bg-muted/10 hover:border-primary/40 hover:bg-primary/[0.02]"
        }`}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
      >
        {previewSrc ? (
          /* Image preview */
          <div className="relative h-40 bg-white">
            <img
              src={previewSrc}
              alt="Product preview"
              className="w-full h-full object-contain p-3"
              onError={(e) => { (e.target as HTMLImageElement).style.opacity = "0.3"; }}
            />
            <button
              type="button"
              onClick={handleClear}
              className="absolute top-2 right-2 p-1.5 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
              title="Remove image"
            >
              <X className="w-3.5 h-3.5" />
            </button>
            {/* Replace overlay */}
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={isUploading}
              className="absolute bottom-2 right-2 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-black/50 text-white text-xs font-medium hover:bg-black/70 transition-colors"
            >
              <Upload className="w-3 h-3" /> Replace
            </button>
          </div>
        ) : isUploading ? (
          /* Upload progress */
          <div className="h-40 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-7 h-7 text-primary animate-spin" />
            <div className="w-32">
              <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-xs text-center text-muted-foreground mt-1">{progress}%</p>
            </div>
          </div>
        ) : (
          /* Empty drop zone */
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="w-full h-40 flex flex-col items-center justify-center gap-2 text-muted-foreground"
          >
            <div className="p-3 rounded-xl bg-primary/10 border border-primary/20">
              <ImageIcon className="w-6 h-6 text-primary/60" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-foreground/70">Drop image here or click to upload</p>
              <p className="text-xs text-muted-foreground mt-0.5">PNG, JPG, WEBP supported</p>
            </div>
          </button>
        )}
      </div>

      {/* Or paste URL */}
      <div className="flex items-center gap-2">
        <div className="flex-1 h-px bg-border/40" />
        <span className="text-xs text-muted-foreground">or paste URL</span>
        <div className="flex-1 h-px bg-border/40" />
      </div>
      <input
        type="url"
        value={urlInput}
        onChange={(e) => setUrlInput(e.target.value)}
        onBlur={handleUrlBlur}
        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleUrlBlur(); } }}
        placeholder="https://example.com/image.jpg"
        className="w-full px-4 py-2.5 rounded-xl bg-background border border-border text-foreground focus:ring-2 focus:ring-primary/50 outline-none text-sm"
      />

      {/* Hidden file input */}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) uploadFile(file);
        }}
      />
    </div>
  );
}
