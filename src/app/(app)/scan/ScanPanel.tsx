"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, Search, UploadCloud, AlertCircle, QrCode, ArrowRight } from "lucide-react";
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
  const [cameraAvailable, setCameraAvailable] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (typeof window !== "undefined" && typeof navigator !== "undefined" && navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === "function") {
      setCameraAvailable(true);
    }
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  async function lookup(token: string) {
    const cleanToken = token.trim();
    if (!cleanToken) return;
    setLoading(true);
    try {
      const data = await apiFetch<{ referral: { id: string; referralCode: string } }>(
        `/api/passport/${encodeURIComponent(cleanToken)}`
      );
      showToast(`Referral ${data.referral.referralCode} verified.`);
      router.push(`/referrals/${data.referral.id}`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Referral passport not found or not authorized for your facility.", "error");
    } finally {
      setLoading(false);
    }
  }

  async function startCamera() {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraActive(true);

      if ("BarcodeDetector" in window && window.BarcodeDetector) {
        pollBarcodeDetector();
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Camera access denied or unavailable";
      setCameraError(msg);
      showToast("Camera access unavailable. Please use file upload or manual code entry.", "error");
    }
  }

  function stopCamera() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCameraActive(false);
  }

  function pollBarcodeDetector() {
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
        // Continue polling
      }
    }, 400);
  }

  // Handle uploaded QR image file
  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if ("BarcodeDetector" in window && window.BarcodeDetector) {
      try {
        const detector = new window.BarcodeDetector({ formats: ["qr_code"] });
        const img = document.createElement("img");
        img.src = URL.createObjectURL(file);
        await img.decode();
        const codes = await detector.detect(img);
        if (codes.length > 0) {
          lookup(codes[0].rawValue);
          return;
        }
      } catch {
        // Fallback below
      }
    }

    // Fallback if barcode detector didn't resolve: prompt filename or manual entry
    showToast("Image uploaded. If QR was not auto-detected, please confirm referral code below.");
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-900">Referral Passport QR Scanner & Lookup</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Scan the physical or digital QR code on a patient&apos;s Referral Passport, upload a photo, or look up by Referral ID.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Left Card: Camera & Image Upload */}
        <div className="rounded-xl border border-border bg-white p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Camera className="size-4 text-brand" />
              <h2 className="text-sm font-bold text-slate-900">Live Camera Scan</h2>
            </div>
            {cameraActive && (
              <span className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 border border-emerald-200">
                <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live Active
              </span>
            )}
          </div>

          <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-slate-900 border border-slate-800 flex items-center justify-center">
            <video
              ref={videoRef}
              className={`size-full object-cover ${cameraActive ? "" : "hidden"}`}
              muted
              playsInline
            />

            {!cameraActive && (
              <div className="text-center p-6 space-y-2 text-slate-400">
                <QrCode className="size-10 mx-auto opacity-40" />
                <p className="text-xs font-medium text-slate-300">Camera preview will activate here</p>
                <p className="text-[11px] text-slate-500 max-w-xs">
                  Position the Referral Passport QR code within the camera frame.
                </p>
              </div>
            )}
          </div>

          {cameraError && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 flex items-start gap-2">
              <AlertCircle className="size-4 shrink-0 mt-0.5 text-amber-600" />
              <div>
                <p className="font-semibold">Camera Access Notice</p>
                <p className="text-[11px] mt-0.5">{cameraError}. You can upload a photo of the QR code or use the manual search.</p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <Button
              variant={cameraActive ? "secondary" : "primary"}
              size="sm"
              className="w-full"
              onClick={cameraActive ? stopCamera : startCamera}
              disabled={!cameraAvailable}
            >
              {cameraActive ? "Stop Camera" : "Start Camera"}
            </Button>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
            >
              <UploadCloud className="size-3.5 text-slate-500" />
              Upload QR Image
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileUpload}
            />
          </div>
        </div>

        {/* Right Card: Fast Manual Search */}
        <div className="rounded-xl border border-border bg-white p-5 shadow-2xs space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Search className="size-4 text-brand" />
            <h2 className="text-sm font-bold text-slate-900">Manual Referral ID / Token Lookup</h2>
          </div>

          <p className="text-xs text-slate-500">
            Enter the alphanumeric Referral Code from the patient&apos;s physical paper slip or digital passport.
          </p>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              lookup(manualCode);
            }}
            className="space-y-3"
          >
            <div>
              <label htmlFor="manual-ref-code" className="mb-1 block text-xs font-semibold text-slate-700">
                Referral Code or Secure Token
              </label>
              <div className="flex gap-2">
                <input
                  id="manual-ref-code"
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  placeholder="e.g. MR-2026-41486"
                  className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-mono text-slate-900 outline-none focus:border-brand focus:ring-1 focus:ring-brand uppercase"
                />
                <Button type="submit" loading={loading} className="px-4">
                  Look Up
                </Button>
              </div>
            </div>
          </form>

          {/* Quick Demo Lookup Shortcuts */}
          <div className="border-t border-slate-100 pt-4 space-y-2">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Sample Active Cases</p>
            <div className="flex flex-wrap gap-2">
              {["MR-2026-41486", "MR-2026-43141", "MR-2026-76505"].map((code) => (
                <button
                  key={code}
                  onClick={() => {
                    setManualCode(code);
                    lookup(code);
                  }}
                  className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-mono font-medium text-slate-700 hover:border-brand hover:bg-brand-soft hover:text-brand-dark transition-colors"
                >
                  <span>{code}</span>
                  <ArrowRight className="size-3 text-slate-400" />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
