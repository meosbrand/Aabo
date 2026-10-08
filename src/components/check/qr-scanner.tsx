"use client";

import { useEffect, useRef, useState } from "react";
import jsQR from "jsqr";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/context/LanguageContext";
import { L, tr } from "@/lib/i18n";

const T = {
  cancel: L("Cancel", "Cancel"),
  hint: L("Point your camera at the QR code", "Point your camera for the QR code"),
  denied: L("Camera not available. You can upload a screenshot of the QR code instead.", "Camera no dey work. Upload screenshot of the QR code instead."),
};

/** Scans a QR code with the camera (Scamio-style QR checking) and returns its content. */
export function QrScanner({ onResult, onClose }: { onResult: (text: string) => void; onClose: () => void }) {
  const { language } = useLanguage();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let raf = 0;
    let stopped = false;

    const tick = () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (stopped || !video || !canvas) return;
      if (video.readyState === video.HAVE_ENOUGH_DATA) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(img.data, img.width, img.height, { inversionAttempts: "dontInvert" });
          if (code?.data) {
            onResult(code.data);
            return;
          }
        }
      }
      raf = requestAnimationFrame(tick);
    };

    navigator.mediaDevices
      ?.getUserMedia({ video: { facingMode: "environment" } })
      .then((s) => {
        stream = s;
        if (videoRef.current) {
          videoRef.current.srcObject = s;
          videoRef.current.play().catch(() => undefined);
          raf = requestAnimationFrame(tick);
        }
      })
      .catch(() => setError(true));
    if (!navigator.mediaDevices) setError(true);

    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [onResult]);

  return (
    <div className="space-y-2 rounded-lg border p-3">
      {error ? (
        <p className="text-sm text-muted-foreground">{tr(language, T.denied)}</p>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">{tr(language, T.hint)}</p>
          <video ref={videoRef} className="aspect-square w-full rounded-md bg-black object-cover" muted playsInline />
        </>
      )}
      <canvas ref={canvasRef} className="hidden" />
      <Button variant="outline" size="sm" onClick={onClose}>
        {tr(language, T.cancel)}
      </Button>
    </div>
  );
}
