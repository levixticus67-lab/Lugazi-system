import { useState, useCallback, useRef } from "react";
import axios from "@/lib/axios";
import { cn } from "@/lib/utils";
import { Upload, X, CheckCircle2, Loader2, FileText, Music, Video, Image as ImageIcon } from "lucide-react";

export interface UploadResult {
  url: string;
  publicId: string;
  format: string;
  resourceType: string;
  bytes: number;
}

interface CloudinaryUploaderProps {
  onUpload: (result: UploadResult) => void;
  accept?: string;
  label?: string;
  className?: string;
  currentUrl?: string | null;
}

function getResourceType(file: File): "image" | "video" | "raw" {
  if (file.type.startsWith("image/")) return "image";
  if (file.type.startsWith("video/") || file.type.startsWith("audio/")) return "video";
  return "raw";
}

function FileTypeIcon({ file }: { file: File }) {
  if (file.type.startsWith("image/")) return <ImageIcon className="h-10 w-10 text-blue-500" />;
  if (file.type.startsWith("video/")) return <Video className="h-10 w-10 text-purple-500" />;
  if (file.type.startsWith("audio/")) return <Music className="h-10 w-10 text-green-500" />;
  return <FileText className="h-10 w-10 text-orange-500" />;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

export default function CloudinaryUploader({
  onUpload,
  accept = "*/*",
  label = "Upload file",
  className,
  currentUrl,
}: CloudinaryUploaderProps) {
  const [status, setStatus] = useState<"idle" | "uploading" | "done" | "error">("idle");
  const [progress, setProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentUrl ?? null);
  const [isDragging, setIsDragging] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback(async (file: File) => {
    setSelectedFile(file);
    setStatus("uploading");
    setProgress(0);
    setErrorMsg("");

    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (e) => setPreviewUrl(e.target?.result as string);
      reader.readAsDataURL(file);
    } else {
      setPreviewUrl(null);
    }

    try {
      const { data: sig } = await axios.get<{
        signature: string;
        timestamp: number;
        cloudName: string;
        apiKey: string;
      }>("/api/media/upload-signature");

      const resourceType = getResourceType(file);
      const formData = new FormData();
      formData.append("file", file);
      formData.append("api_key", sig.apiKey);
      formData.append("timestamp", String(sig.timestamp));
      formData.append("signature", sig.signature);
      formData.append("folder", "dcl-lugazi");

      const cloudUrl = `https://api.cloudinary.com/v1_1/${sig.cloudName}/${resourceType}/upload`;

      const result = await new Promise<Record<string, unknown>>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", cloudUrl);
        xhr.upload.addEventListener("progress", (e) => {
          if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100));
        });
        xhr.addEventListener("load", () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(JSON.parse(xhr.responseText) as Record<string, unknown>);
          } else {
            const err = JSON.parse(xhr.responseText || "{}") as { error?: { message?: string } };
            reject(new Error(err?.error?.message ?? "Upload failed"));
          }
        });
        xhr.addEventListener("error", () => reject(new Error("Network error during upload")));
        xhr.send(formData);
      });

      setStatus("done");
      setProgress(100);
      onUpload({
        url: result.secure_url as string,
        publicId: result.public_id as string,
        format: result.format as string,
        resourceType: result.resource_type as string,
        bytes: result.bytes as number,
      });
    } catch (err) {
      setStatus("error");
      setErrorMsg(err instanceof Error ? err.message : "Upload failed");
    }
  }, [onUpload]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }, [processFile]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const reset = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setStatus("idle");
    setProgress(0);
    setSelectedFile(null);
    setPreviewUrl(currentUrl ?? null);
    setErrorMsg("");
    if (inputRef.current) inputRef.current.value = "";
  };

  const isImage = selectedFile?.type.startsWith("image/") || (!selectedFile && !!currentUrl);

  return (
    <div className={cn("space-y-2", className)}>
      <div
        className={cn(
          "relative border-2 border-dashed rounded-xl transition-all cursor-pointer select-none",
          isDragging ? "border-primary bg-primary/5 scale-[1.01]" : "border-border hover:border-primary/50 hover:bg-muted/30",
          status === "done" && "border-green-400 bg-green-50 dark:bg-green-950/20",
          status === "error" && "border-red-400 bg-red-50 dark:bg-red-950/20",
        )}
        onDragEnter={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
        onDrop={handleDrop}
        onClick={() => status !== "uploading" && inputRef.current?.click()}
      >
        <input ref={inputRef} type="file" accept={accept} className="hidden" onChange={handleChange} />

        {previewUrl && isImage ? (
          <div className="relative flex items-center justify-center overflow-hidden rounded-xl min-h-[100px]">
            <img src={previewUrl} alt="Preview" className="max-h-48 w-full object-contain rounded-xl p-1" />
            {status !== "uploading" && (
              <button
                className="absolute top-2 right-2 bg-black/60 text-white rounded-full p-1 hover:bg-black/80 transition-colors"
                onClick={reset}
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        ) : (
          <div className="py-10 flex flex-col items-center gap-3">
            {status === "uploading" ? (
              <Loader2 className="h-10 w-10 text-primary animate-spin" />
            ) : status === "done" ? (
              <CheckCircle2 className="h-10 w-10 text-green-500" />
            ) : selectedFile ? (
              <FileTypeIcon file={selectedFile} />
            ) : (
              <Upload className="h-10 w-10 text-muted-foreground" />
            )}
            <div className="text-center px-4">
              <p className="text-sm font-medium text-foreground">
                {status === "uploading"
                  ? `Uploading… ${progress}%`
                  : status === "done"
                  ? "Upload complete!"
                  : status === "error"
                  ? "Upload failed"
                  : isDragging
                  ? "Drop file here"
                  : label}
              </p>
              {status === "idle" && (
                <p className="text-xs text-muted-foreground mt-1">Drag & drop or click to browse</p>
              )}
              {selectedFile && status !== "uploading" && (
                <p className="text-xs text-muted-foreground mt-1 truncate max-w-[220px] mx-auto">
                  {selectedFile.name} {status === "done" ? `· ${formatBytes(selectedFile.size)}` : ""}
                </p>
              )}
              {errorMsg && <p className="text-xs text-red-500 mt-1">{errorMsg}</p>}
              {status !== "idle" && status !== "uploading" && (
                <button
                  className="text-xs text-primary hover:underline mt-2"
                  onClick={reset}
                >
                  Upload different file
                </button>
              )}
            </div>
          </div>
        )}

        {status === "uploading" && (
          <div className="px-4 pb-4">
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
