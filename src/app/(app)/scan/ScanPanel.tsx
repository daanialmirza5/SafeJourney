"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, Search } from "lucide-react";
import { apiFetch } from "@/lib/clientApi";
import { useToast } from "@/components/ui/Toast";
import { Button } from "@/components/ui/Button";

declare global {
  interface Window {
    BarcodeDetector?: new (options: { formats: string[] }) => {
      detect: (source: CanvasImageSource) => Promise<{ rawValue: string }[]>;
    };
  }
}

export function ScanPanel() {
  const router = useRouter();
  const { showToast } = useToast();
  const [manualCode, setManualCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [cameraSupported, setCameraSupported] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    setCameraSupported(typeof window !== "undefined" && "BarcodeDetector" in window);
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  async function lookup(token: string) {
    if (!token.trim()) return;
    setLoading(true);
    try {
      const data = await apiFetch<{ referral: { id: string } }>(`/api/passport/${encodeURIComponent(token.trim())}`);
      showToast("Referral found.");
      router.push(`/referrals/${data.referral.id}`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Referral not found or not authorized.", "error");
    } finally {
      setLoading(false);
    }
  }

  async function startCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraActive(true);
      pollForBarcode();
    } catch {
      showToast("Could not access the camera. Use manual entry instead.", "error");
    }
  }

  function stopCamera() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCameraActive(false);
  }

  function pollForBarcode() {
    if (!window.BarcodeDetector) return;
    const detector = new window.BarcodeDetector({ formats: ["qr_code"] });
    const interval = setInterval(async () => {
      if (!videoRef.current || !streamRef.current) {
        clearInterval(interval);
        return;
      }
      try {
        const codes = await detector.detect(videoRef.current);
        if (codes.length > 0) {
          clearInterval(interval);
          stopCamera();
          lookup(codes[0].rawValue);
        }
      } catch {
        // keep polling
      }
    }, 500);
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div className="rounded-xl border border-border bg-white p-5">
        <div className="mb-3 flex items-center gap-2">
          <Camera className="size-4 text-slate-400" />
          <p className="text-sm font-medium text-slate-700">Camera scan</p>
        </div>
        {cameraSupported ? (
          <>
            <video ref={videoRef} className={`aspect-video w-full rounded-lg bg-slate-900 ${cameraActive ? "" : "hidden"}`} muted playsInline />
            {!cameraActive && (
              <div className="flex aspect-video items-center justify-center rounded-lg bg-slate-100 text-xs text-slate-400">Camera preview will appear here</div>
            )}
            <Button variant="secondary" size="sm" className="mt-3 w-full" onClick={cameraActive ? stopCamera : startCamera}>
              {cameraActive ? "Stop camera" : "Start camera"}
            </Button>
          </>
        ) : (
          <p className="text-xs text-slate-400">Camera-based scanning isn&apos;t supported in this browser. Use manual entry.</p>
        )}
      </div>

      <div className="rounded-xl border border-border bg-white p-5">
        <div className="mb-3 flex items-center gap-2">
          <Search className="size-4 text-slate-400" />
          <p className="text-sm font-medium text-slate-700">Manual referral ID / token</p>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            lookup(manualCode);
          }}
          className="flex gap-2"
        >
          <input
            value={manualCode}
            onChange={(e) => setManualCode(e.target.value)}
            placeholder="e.g. MR-2026-10482"
            aria-label="Manual referral ID or token"
            className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <Button type="submit" loading={loading}>
            Look up
          </Button>
        </form>
        <p className="mt-3 text-xs text-slate-400">Works as a fallback whenever a QR code isn&apos;t available.</p>
      </div>
    </div>
  );
}
