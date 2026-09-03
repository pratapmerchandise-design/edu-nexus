import React, { useRef, useState, useCallback } from 'react';
import { Camera, X, Check, RefreshCw } from 'lucide-react';

interface CameraModalProps {
  onClose: () => void;
  onCapture: (file: File) => void;
}

export const CameraModal: React.FC<CameraModalProps> = ({ onClose, onCapture }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const startCamera = useCallback(async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      setError(null);
    } catch (err: any) {
      setError(err.message || "Failed to access camera");
    }
  }, []);

  React.useEffect(() => {
    startCamera();
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [startCamera]);

  const capture = useCallback(() => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        setImageSrc(canvas.toDataURL('image/jpeg'));
        if (stream) {
          stream.getTracks().forEach(track => track.stop());
        }
      }
    }
  }, [stream]);

  const retake = () => {
    setImageSrc(null);
    startCamera();
  };

  const confirm = () => {
    if (imageSrc) {
      // Convert base64 to File
      fetch(imageSrc)
        .then(res => res.blob())
        .then(blob => {
          const file = new File([blob], `capture-${Date.now()}.jpg`, { type: 'image/jpeg' });
          onCapture(file);
        });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black p-4">
      <div className="bg-card w-full max-w-md rounded-3xl overflow-hidden flex flex-col relative animate-in fade-in zoom-in duration-200">
        <div className="absolute top-4 right-4 z-10 flex gap-2">
          <button onClick={onClose} className="p-2 bg-black/50 hover:bg-black/80 rounded-full text-white backdrop-blur-md transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error ? (
          <div className="p-8 text-center flex flex-col items-center gap-4">
            <Camera className="w-12 h-12 text-muted-foreground" />
            <p className="text-sm font-bold text-foreground">Camera Error</p>
            <p className="text-xs text-muted-foreground">{error}</p>
          </div>
        ) : (
          <div className="relative aspect-[3/4] bg-black flex items-center justify-center overflow-hidden">
            {!imageSrc ? (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />
            ) : (
              <img src={imageSrc} alt="captured" className="w-full h-full object-cover" />
            )}
            
            {/* hidden canvas for processing */}
            <canvas ref={canvasRef} className="hidden" />
            
            <div className="absolute bottom-0 inset-x-0 p-6 bg-gradient-to-t from-black/80 to-transparent flex justify-center items-center gap-6">
              {!imageSrc ? (
                <button 
                  onClick={capture}
                  className="w-16 h-16 rounded-full border-4 border-white/80 flex items-center justify-center hover:scale-105 transition-transform"
                >
                  <div className="w-12 h-12 bg-white rounded-full" />
                </button>
              ) : (
                <>
                  <button onClick={retake} className="flex flex-col items-center gap-1 text-white hover:text-white/80">
                    <div className="p-3 bg-white/20 rounded-full backdrop-blur-md"><RefreshCw className="w-5 h-5" /></div>
                    <span className="text-[10px] font-bold uppercase tracking-wider">Retake</span>
                  </button>
                  <button onClick={confirm} className="flex flex-col items-center gap-1 text-white hover:text-primary-foreground">
                    <div className="p-3 bg-primary rounded-full shadow-lg"><Check className="w-5 h-5" /></div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-primary">Send</span>
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
