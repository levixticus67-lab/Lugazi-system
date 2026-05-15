import { useRef, useState } from "react";
import { Camera, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

interface QrScannerProps {
  onScan: (token: string) => void;
  label?: string;
}

export default function QrScanner({ onScan, label = "Scan QR Code" }: QrScannerProps) {
  const [scanning, setScanning] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);

  async function decodeImageFile(file: File) {
    setError(null);
    const url = URL.createObjectURL(file);
    setPreview(url);
    const img = new Image();
    img.src = url;
    img.onload = async () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      try {
        const jsQR = (await import("jsqr")).default;
        const code = jsQR(imageData.data, imageData.width, imageData.height);
        if (code) {
          onScan(code.data);
          setError(null);
        } else {
          setError("No QR code found in image. Try a clearer photo.");
        }
      } catch {
        setError("Failed to read QR code.");
      }
    };
  }

  async function startCamera() {
    setError(null);
    setScanning(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        scanFrame();
      }
    } catch {
      setError("Camera access denied. Use the image upload option instead.");
      setScanning(false);
    }
  }

  function stopCamera() {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setScanning(false);
  }

  async function scanFrame() {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (video.readyState === video.HAVE_ENOUGH_DATA) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      try {
        const jsQR = (await import("jsqr")).default;
        const code = jsQR(imageData.data, imageData.width, imageData.height);
        if (code) {
          onScan(code.data);
          stopCamera();
          return;
        }
      } catch {
        // continue scanning
      }
    }
    rafRef.current = requestAnimationFrame(scanFrame);
  }

  return (
    <div className="space-y-3">
      <Label className="text-sm font-medium">{label}</Label>

      {scanning ? (
        <div className="relative rounded-xl overflow-hidden border border-primary/30 bg-black">
          <video ref={videoRef} className="w-full max-h-64 object-cover" playsInline muted />
          <canvas ref={canvasRef} className="hidden" />
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-48 h-48 border-2 border-primary/70 rounded-xl">
              <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-primary rounded-tl-lg" />
              <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-primary rounded-tr-lg" />
              <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-primary rounded-bl-lg" />
              <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-primary rounded-br-lg" />
            </div>
          </div>
          <button
            onClick={stopCamera}
            className="absolute top-2 right-2 bg-black/60 text-white rounded-full p-1 hover:bg-black/80 transition"
          >
            <X className="h-4 w-4" />
          </button>
          <p className="absolute bottom-2 left-0 right-0 text-center text-white text-xs bg-black/40 py-1">
            Point camera at QR code
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {preview && (
            <div className="relative">
              <img src={preview} alt="QR preview" className="rounded-lg max-h-40 object-contain border border-border w-full" />
              <button
                onClick={() => { setPreview(null); setError(null); }}
                className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          )}

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="flex-1 border-primary/30 hover:border-primary/60 hover:bg-primary/5"
              onClick={startCamera}
            >
              <Camera className="h-4 w-4 mr-1.5" />
              Use Camera
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="flex-1 border-primary/30 hover:border-primary/60 hover:bg-primary/5"
              onClick={() => galleryRef.current?.click()}
            >
              <Upload className="h-4 w-4 mr-1.5" />
              From Gallery
            </Button>
          </div>

          {/* Gallery-only input: explicit file extensions force file picker (not camera) on Android */}
          <input
            ref={galleryRef}
            type="file"
            accept=".jpg,.jpeg,.png,.gif,.webp,.bmp,.heic,.heif"
            className="hidden"
            onChange={e => {
              const file = e.target.files?.[0];
              if (file) decodeImageFile(file);
              e.target.value = "";
            }}
          />
        </div>
      )}

      {error && (
        <p className="text-xs text-destructive bg-destructive/10 rounded-lg px-3 py-2">{error}</p>
      )}
    </div>
  );
}
