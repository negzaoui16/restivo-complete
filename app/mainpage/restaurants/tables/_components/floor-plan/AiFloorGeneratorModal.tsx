"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import {
  Sparkles,
  Camera,
  Upload,
  RefreshCw,
  X,
  Compass,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Layers,
  Users,
  Store,
  ChevronRight,
  Info,
  Maximize2,
  Trash2,
} from "lucide-react";
import type { FloorObject } from "./floor-object";
import type { FloorPlanSummary } from "@/lib/ai/floor-plan/types";

interface AiFloorGeneratorModalProps {
  restaurantId: string;
  floorWidth: number;
  floorHeight: number;
  onApply: (objects: FloorObject[], mode: "replace" | "merge") => void;
  onClose: () => void;
}

type Step = "guide" | "capture" | "review";

export function AiFloorGeneratorModal({
  restaurantId,
  floorWidth,
  floorHeight,
  onApply,
  onClose,
}: AiFloorGeneratorModalProps) {
  const [step, setStep] = useState<Step>("guide");

  // Photos state (data URLs)
  const [frontPhoto, setFrontPhoto] = useState<string | null>(null);
  const [backPhoto, setBackPhoto] = useState<string | null>(null);

  // Settings
  const [width, setWidth] = useState(floorWidth || 16);
  const [height, setHeight] = useState(floorHeight || 10);
  const [notes, setNotes] = useState("");
  const [generateChairs, setGenerateChairs] = useState(true);

  // Live camera stream state
  const [activeCameraTarget, setActiveCameraTarget] = useState<"front" | "back" | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Processing state
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStepText, setLoadingStepText] = useState("Analyzing spatial geometry with Gemini...");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Generated results
  const [generatedObjects, setGeneratedObjects] = useState<FloorObject[]>([]);
  const [summary, setSummary] = useState<FloorPlanSummary | null>(null);
  const [applyMode, setApplyMode] = useState<"replace" | "merge">("replace");

  // File input refs
  const frontFileInputRef = useRef<HTMLInputElement | null>(null);
  const backFileInputRef = useRef<HTMLInputElement | null>(null);

  // Clean up camera stream on unmount or cancel
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setActiveCameraTarget(null);
  }, []);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  // Start live camera
  const startCamera = async (target: "front" | "back") => {
    setErrorMessage(null);
    stopCamera();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      });
      streamRef.current = stream;
      setActiveCameraTarget(target);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch (err) {
      console.warn("Camera access failed:", err);
      setErrorMessage("Could not access camera. Please select 'Upload Photo' instead.");
      setActiveCameraTarget(null);
    }
  };

  // Capture frame from live video
  const captureFrame = (target: "front" | "back") => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = Math.min(video.videoWidth || 1280, 1280);
    const aspect = (video.videoHeight || 720) / (video.videoWidth || 1280);
    canvas.height = Math.round(canvas.width * aspect);

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.85);

    if (target === "front") setFrontPhoto(dataUrl);
    else setBackPhoto(dataUrl);

    stopCamera();
  };

  // Compress & handle file upload
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, target: "front" | "back") => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const maxDim = 1280;
        let w = img.width;
        let h = img.height;
        if (w > maxDim || h > maxDim) {
          if (w > h) {
            h = Math.round((h * maxDim) / w);
            w = maxDim;
          } else {
            w = Math.round((w * maxDim) / h);
            h = maxDim;
          }
        }
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0, w, h);
        const compressed = canvas.toDataURL("image/jpeg", 0.82);
        if (target === "front") setFrontPhoto(compressed);
        else setBackPhoto(compressed);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  // Run AI Generation
  const handleGenerate = async () => {
    if (!frontPhoto || !backPhoto) {
      setErrorMessage("Both Front and Back photos are required to reconstruct the floor plan.");
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setLoadingStepText("Encoding dual perspectives...");

    const stepTimer1 = setTimeout(() => {
      setLoadingStepText("Gemini Vision analyzing 360° restaurant geometry...");
    }, 2500);

    const stepTimer2 = setTimeout(() => {
      setLoadingStepText("Mapping tables, seating aisles, and architectural items to 2D coordinates...");
    }, 6000);

    try {
      const res = await fetch(`/api/restaurants/${restaurantId}/floors/ai-generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          frontImage: frontPhoto,
          backImage: backPhoto,
          floorWidth: Number(width),
          floorHeight: Number(height),
          notes,
          generateChairs,
        }),
      });

      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);

      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Failed to generate floor plan with AI.");
      }

      setGeneratedObjects(data.objects || []);
      setSummary(data.summary || null);
      setStep("review");
    } catch (err: unknown) {
      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);
      const msg = err instanceof Error ? err.message : "An unexpected error occurred during generation.";
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApply = () => {
    if (generatedObjects.length === 0) return;
    onApply(generatedObjects, applyMode);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-[#E5DFD3] bg-white shadow-2xl">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-[#E5DFD3] bg-[#FAF7F2] px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#B55234] to-[#E27D60] text-white shadow-sm">
              <Sparkles className="h-5 w-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-[#1A1A1A]">Generate 2D Floor Plan with AI</h2>
                <span className="rounded-full bg-[#FAF0EA] px-2 py-0.5 text-[11px] font-semibold text-[#B55234]">
                  Gemini Vision 360°
                </span>
              </div>
              <p className="text-xs text-[#736D65]">
                Reconstruct your dining hall layout from two center-point perspective photos
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-[#736D65] hover:bg-[#EAE4D8] hover:text-[#1A1A1A] transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {errorMessage && (
            <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs text-red-800">
              <AlertCircle className="h-4 w-4 shrink-0 text-red-600 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold">Generation Notice</p>
                <p className="mt-0.5 text-red-700">{errorMessage}</p>
              </div>
              <button
                type="button"
                onClick={() => setErrorMessage(null)}
                className="text-red-400 hover:text-red-700"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {/* STEP 1: Positioning Guide */}
          {step === "guide" && (
            <div className="flex flex-col gap-6 animate-in fade-in duration-150">
              <div className="rounded-2xl border border-[#E5DFD3] bg-[#FAF7F2] p-5 text-center">
                <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#FAF0EA] text-[#B55234]">
                  <Compass className="h-7 w-7 animate-spin-slow" />
                </div>
                <h3 className="text-lg font-bold text-[#1A1A1A]">How to Capture Your Restaurant</h3>
                <p className="mx-auto mt-1 max-w-md text-xs leading-relaxed text-[#736D65]">
                  Gemini Vision spatial engine matches your perspective photos to Restivo&apos;s 2D architectural
                  catalogue with true dimensions and spacing.
                </p>

                {/* Spatial Diagram */}
                <div className="my-5 grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
                  <div className="flex items-start gap-3 rounded-xl border border-[#E5DFD3] bg-white p-3.5 shadow-2xs">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#FAF0EA] text-xs font-bold text-[#B55234]">
                      1
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-[#1A1A1A]">Photo 1: Facing Front</h4>
                      <p className="mt-1 text-[11px] text-[#736D65]">
                        Stand in the <strong>exact center</strong> of the room. Face towards the main entrance / front
                        windows and snap a photo horizontally.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 rounded-xl border border-[#E5DFD3] bg-white p-3.5 shadow-2xs">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#FAF0EA] text-xs font-bold text-[#B55234]">
                      2
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-[#1A1A1A]">Photo 2: Facing Back (180°)</h4>
                      <p className="mt-1 text-[11px] text-[#736D65]">
                        Without moving from the center, <strong>turn 180° around</strong> towards the rear (bar,
                        kitchen, rear tables) and snap the second photo.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-center gap-2 text-xs font-medium text-[#736D65]">
                  <Info className="h-4 w-4 text-[#B55234]" />
                  <span>Pro Tip: Keep lights on and hold camera steady at chest height for best accuracy.</span>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setStep("capture")}
                  className="flex items-center gap-2 rounded-xl bg-[#B55234] px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-[#9E4328] transition"
                >
                  <span>Continue to Take Photos</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: Capture Photos (Front & Back) */}
          {step === "capture" && !isLoading && (
            <div className="flex flex-col gap-6 animate-in fade-in duration-150">
              {/* Dual Photo Capture Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* PHOTO 1: FRONT VIEW */}
                <div className="flex flex-col rounded-2xl border border-[#E5DFD3] bg-[#FAF7F2] p-4">
                  <div className="mb-2.5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#B55234] text-[11px] font-bold text-white">
                        1
                      </span>
                      <h4 className="text-xs font-bold text-[#1A1A1A]">Front View (Entrance / Main)</h4>
                    </div>
                    {frontPhoto && (
                      <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Ready
                      </span>
                    )}
                  </div>

                  {/* Preview or Action */}
                  <div className="relative flex aspect-4/3 w-full flex-col items-center justify-center overflow-hidden rounded-xl border border-dashed border-[#D5CEBF] bg-white">
                    {frontPhoto ? (
                      <>
                        <img
                          src={frontPhoto}
                          alt="Front perspective"
                          className="h-full w-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => setFrontPhoto(null)}
                          className="absolute top-2 right-2 rounded-lg bg-black/60 p-1.5 text-white hover:bg-black/80 transition"
                          title="Remove photo"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </>
                    ) : (
                      <div className="flex flex-col items-center p-4 text-center">
                        <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-[#FAF0EA] text-[#B55234]">
                          <Camera className="h-5 w-5" />
                        </div>
                        <p className="text-xs font-semibold text-[#1A1A1A]">Facing Forward</p>
                        <p className="mt-0.5 text-[11px] text-[#736D65]">Entrance, front windows, or front tables</p>

                        <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => startCamera("front")}
                            className="flex items-center gap-1.5 rounded-lg border border-[#E5DFD3] bg-[#FAF7F2] px-3 py-1.5 text-[11px] font-bold text-[#1A1A1A] hover:bg-[#FAF0EA] hover:text-[#B55234] transition"
                          >
                            <Camera className="h-3.5 w-3.5" />
                            Use Camera
                          </button>
                          <button
                            type="button"
                            onClick={() => frontFileInputRef.current?.click()}
                            className="flex items-center gap-1.5 rounded-lg border border-[#E5DFD3] bg-white px-3 py-1.5 text-[11px] font-bold text-[#736D65] hover:bg-[#FAF7F2] hover:text-[#1A1A1A] transition"
                          >
                            <Upload className="h-3.5 w-3.5" />
                            Upload
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                  <input
                    ref={frontFileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleFileChange(e, "front")}
                  />
                </div>

                {/* PHOTO 2: BACK VIEW */}
                <div className="flex flex-col rounded-2xl border border-[#E5DFD3] bg-[#FAF7F2] p-4">
                  <div className="mb-2.5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#B55234] text-[11px] font-bold text-white">
                        2
                      </span>
                      <h4 className="text-xs font-bold text-[#1A1A1A]">Back View (180° Rear / Bar)</h4>
                    </div>
                    {backPhoto && (
                      <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Ready
                      </span>
                    )}
                  </div>

                  {/* Preview or Action */}
                  <div className="relative flex aspect-4/3 w-full flex-col items-center justify-center overflow-hidden rounded-xl border border-dashed border-[#D5CEBF] bg-white">
                    {backPhoto ? (
                      <>
                        <img
                          src={backPhoto}
                          alt="Back perspective"
                          className="h-full w-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => setBackPhoto(null)}
                          className="absolute top-2 right-2 rounded-lg bg-black/60 p-1.5 text-white hover:bg-black/80 transition"
                          title="Remove photo"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </>
                    ) : (
                      <div className="flex flex-col items-center p-4 text-center">
                        <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-[#FAF0EA] text-[#B55234]">
                          <Camera className="h-5 w-5" />
                        </div>
                        <p className="text-xs font-semibold text-[#1A1A1A]">Facing Backward</p>
                        <p className="mt-0.5 text-[11px] text-[#736D65]">Bar, kitchen pass, booths, or rear seats</p>

                        <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => startCamera("back")}
                            className="flex items-center gap-1.5 rounded-lg border border-[#E5DFD3] bg-[#FAF7F2] px-3 py-1.5 text-[11px] font-bold text-[#1A1A1A] hover:bg-[#FAF0EA] hover:text-[#B55234] transition"
                          >
                            <Camera className="h-3.5 w-3.5" />
                            Use Camera
                          </button>
                          <button
                            type="button"
                            onClick={() => backFileInputRef.current?.click()}
                            className="flex items-center gap-1.5 rounded-lg border border-[#E5DFD3] bg-white px-3 py-1.5 text-[11px] font-bold text-[#736D65] hover:bg-[#FAF7F2] hover:text-[#1A1A1A] transition"
                          >
                            <Upload className="h-3.5 w-3.5" />
                            Upload
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                  <input
                    ref={backFileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleFileChange(e, "back")}
                  />
                </div>
              </div>

              {/* Live Camera Viewfinder Overlay */}
              {activeCameraTarget && (
                <div className="relative flex flex-col items-center justify-center rounded-2xl border border-[#B55234] bg-black p-4 text-white overflow-hidden">
                  <div className="absolute top-3 left-4 flex items-center gap-2 z-10">
                    <span className="flex h-2.5 w-2.5 rounded-full bg-red-500 animate-ping" />
                    <span className="text-xs font-bold tracking-wider uppercase">
                      Live Viewfinder: {activeCameraTarget === "front" ? "Front View" : "Back View (180°)"}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={stopCamera}
                    className="absolute top-3 right-4 rounded-lg bg-white/20 p-1 hover:bg-white/40 z-10"
                  >
                    <X className="h-4 w-4" />
                  </button>

                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full max-h-[340px] rounded-xl object-contain bg-black"
                  />

                  <div className="mt-3 flex items-center justify-center gap-3">
                    <button
                      type="button"
                      onClick={() => captureFrame(activeCameraTarget)}
                      className="flex items-center gap-2 rounded-xl bg-[#B55234] px-6 py-2.5 text-xs font-bold text-white shadow-lg hover:bg-[#9E4328] transition"
                    >
                      <Camera className="h-4 w-4" />
                      Take Snapshot
                    </button>
                    <button
                      type="button"
                      onClick={stopCamera}
                      className="rounded-xl border border-white/30 px-4 py-2 text-xs font-semibold text-white/80 hover:bg-white/10"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Room Dimensions & Optional Notes */}
              <div className="rounded-2xl border border-[#E5DFD3] bg-[#FAF7F2] p-4 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#1A1A1A]">Room Specifications (Meters)</span>
                  <span className="text-[11px] text-[#736D65]">Prefilled from current floor</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-[#736D65]">Width (X axis)</label>
                    <div className="mt-1 flex items-center rounded-lg border border-[#E5DFD3] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#1A1A1A]">
                      <input
                        type="number"
                        min="5"
                        max="80"
                        step="0.5"
                        value={width}
                        onChange={(e) => setWidth(Number(e.target.value) || 16)}
                        className="w-full bg-transparent outline-none"
                      />
                      <span className="text-[#736D65] text-[11px] ml-1">m</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-[#736D65]">Height (Y axis)</label>
                    <div className="mt-1 flex items-center rounded-lg border border-[#E5DFD3] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#1A1A1A]">
                      <input
                        type="number"
                        min="5"
                        max="80"
                        step="0.5"
                        value={height}
                        onChange={(e) => setHeight(Number(e.target.value) || 10)}
                        className="w-full bg-transparent outline-none"
                      />
                      <span className="text-[#736D65] text-[11px] ml-1">m</span>
                    </div>
                  </div>

                  <div className="col-span-2 sm:col-span-1 flex items-center">
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-[#1A1A1A] mt-3 sm:mt-0">
                      <input
                        type="checkbox"
                        checked={generateChairs}
                        onChange={(e) => setGenerateChairs(e.target.checked)}
                        className="rounded border-[#D5CEBF] text-[#B55234] focus:ring-[#B55234]"
                      />
                      <span>Auto-position chairs around tables</span>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#736D65]">
                    Special Layout Context (Optional)
                  </label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="e.g. Bar is along the right wall, booths are on the left side..."
                    className="mt-1 w-full rounded-lg border border-[#E5DFD3] bg-white px-3 py-1.5 text-xs text-[#1A1A1A] placeholder:text-[#9C9589] outline-none focus:border-[#B55234]"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setStep("guide")}
                  className="rounded-xl border border-[#E5DFD3] bg-white px-4 py-2 text-xs font-bold text-[#736D65] hover:bg-[#FAF7F2] transition"
                >
                  Back to Guide
                </button>

                <button
                  type="button"
                  disabled={!frontPhoto || !backPhoto || isLoading}
                  onClick={handleGenerate}
                  className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#B55234] to-[#C96345] px-6 py-2.5 text-xs font-bold text-white shadow-md hover:from-[#9E4328] hover:to-[#B55234] transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Sparkles className="h-4 w-4" />
                  <span>Generate 2D Floor Plan</span>
                </button>
              </div>
            </div>
          )}

          {/* LOADING STATE */}
          {isLoading && (
            <div className="flex flex-col items-center justify-center py-16 text-center animate-in fade-in duration-200">
              <div className="relative mb-5 flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-[#FAF0EA] to-[#F5E6DC] text-[#B55234] shadow-inner">
                <Sparkles className="h-10 w-10 animate-bounce" />
                <div className="absolute inset-0 rounded-3xl border-2 border-[#B55234] border-t-transparent animate-spin" />
              </div>

              <h3 className="text-base font-bold text-[#1A1A1A]">Synthesizing 2D Floor Architecture</h3>
              <p className="mt-1.5 max-w-sm text-xs text-[#736D65] animate-pulse">{loadingStepText}</p>

              <div className="mt-6 flex flex-col gap-2 w-full max-w-xs text-left">
                <div className="flex items-center gap-2 text-xs text-[#736D65]">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                  <span>Dual photos encoded (1280px optimized)</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-[#736D65]">
                  <div className="h-3.5 w-3.5 rounded-full border-2 border-[#B55234] border-t-transparent animate-spin" />
                  <span className="font-semibold text-[#1A1A1A]">Gemini Vision mapping coordinates</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-[#9C9589]">
                  <span className="h-2 w-2 rounded-full bg-[#D5CEBF] ml-1" />
                  <span className="ml-1">Synthesizing Restivo SVG objects</span>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Review & Apply */}
          {step === "review" && (
            <div className="flex flex-col gap-5 animate-in fade-in duration-150">
              {/* Summary Banner */}
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white">
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-emerald-950">Floor Plan Extracted Successfully!</h3>
                    <p className="mt-0.5 text-xs text-emerald-800">
                      {summary?.layoutDescription || "AI matched detected physical items to Restivo SVG catalog."}
                    </p>
                  </div>
                </div>

                {/* Metrics Cards */}
                <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div className="rounded-xl border border-emerald-200/80 bg-white p-2.5 text-center">
                    <span className="text-[11px] font-semibold text-[#736D65]">Tables Detected</span>
                    <p className="mt-0.5 text-lg font-extrabold text-[#1A1A1A]">{summary?.tableCount ?? 0}</p>
                  </div>
                  <div className="rounded-xl border border-emerald-200/80 bg-white p-2.5 text-center">
                    <span className="text-[11px] font-semibold text-[#736D65]">Estimated Seats</span>
                    <p className="mt-0.5 text-lg font-extrabold text-[#B55234]">{summary?.seatCount ?? 0}</p>
                  </div>
                  <div className="rounded-xl border border-emerald-200/80 bg-white p-2.5 text-center">
                    <span className="text-[11px] font-semibold text-[#736D65]">Total 2D Objects</span>
                    <p className="mt-0.5 text-lg font-extrabold text-[#1A1A1A]">{generatedObjects.length}</p>
                  </div>
                  <div className="rounded-xl border border-emerald-200/80 bg-white p-2.5 text-center">
                    <span className="text-[11px] font-semibold text-[#736D65]">Venue Dimensions</span>
                    <p className="mt-0.5 text-sm font-bold text-[#1A1A1A]">
                      {width}m × {height}m
                    </p>
                  </div>
                </div>
              </div>

              {/* Layout Breakdown */}
              <div className="rounded-2xl border border-[#E5DFD3] bg-[#FAF7F2] p-4">
                <h4 className="text-xs font-bold text-[#1A1A1A]">Detected Objects Breakdown</h4>
                <div className="mt-2.5 flex flex-wrap gap-2">
                  {Object.entries(summary?.tablesByType || {}).map(([type, count]) => (
                    <span
                      key={type}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-[#E5DFD3] bg-white px-2.5 py-1 text-xs font-semibold text-[#1A1A1A]"
                    >
                      <span className="h-2 w-2 rounded-full bg-[#B55234]" />
                      <span>{type.replace("_", " ").toLowerCase()}:</span>
                      <strong className="text-[#B55234]">{count}</strong>
                    </span>
                  ))}
                  {generatedObjects.filter((o) => o.type === "CHAIR").length > 0 && (
                    <span className="inline-flex items-center gap-1.5 rounded-lg border border-[#E5DFD3] bg-white px-2.5 py-1 text-xs font-semibold text-[#1A1A1A]">
                      <span className="h-2 w-2 rounded-full bg-amber-500" />
                      <span>chairs:</span>
                      <strong>{generatedObjects.filter((o) => o.type === "CHAIR").length}</strong>
                    </span>
                  )}
                  {generatedObjects.filter((o) => o.type === "BAR").length > 0 && (
                    <span className="inline-flex items-center gap-1.5 rounded-lg border border-[#E5DFD3] bg-white px-2.5 py-1 text-xs font-semibold text-[#1A1A1A]">
                      <span className="h-2 w-2 rounded-full bg-blue-500" />
                      <span>bar counter: 1</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Mode Selection */}
              <div className="rounded-2xl border border-[#E5DFD3] bg-white p-4">
                <span className="text-xs font-bold text-[#1A1A1A]">How would you like to apply this layout?</span>
                <div className="mt-2.5 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label
                    className={`flex items-start gap-3 rounded-xl border p-3 cursor-pointer transition ${
                      applyMode === "replace"
                        ? "border-[#B55234] bg-[#FAF0EA]"
                        : "border-[#E5DFD3] bg-white hover:border-[#D5CEBF]"
                    }`}
                  >
                    <input
                      type="radio"
                      name="applyMode"
                      checked={applyMode === "replace"}
                      onChange={() => setApplyMode("replace")}
                      className="mt-0.5 text-[#B55234] focus:ring-[#B55234]"
                    />
                    <div>
                      <p className="text-xs font-bold text-[#1A1A1A]">Replace Existing Layout</p>
                      <p className="mt-0.5 text-[11px] text-[#736D65]">
                        Clear current canvas and place the newly generated AI plan.
                      </p>
                    </div>
                  </label>

                  <label
                    className={`flex items-start gap-3 rounded-xl border p-3 cursor-pointer transition ${
                      applyMode === "merge"
                        ? "border-[#B55234] bg-[#FAF0EA]"
                        : "border-[#E5DFD3] bg-white hover:border-[#D5CEBF]"
                    }`}
                  >
                    <input
                      type="radio"
                      name="applyMode"
                      checked={applyMode === "merge"}
                      onChange={() => setApplyMode("merge")}
                      className="mt-0.5 text-[#B55234] focus:ring-[#B55234]"
                    />
                    <div>
                      <p className="text-xs font-bold text-[#1A1A1A]">Merge with Existing</p>
                      <p className="mt-0.5 text-[11px] text-[#736D65]">
                        Keep existing walls & objects, append AI detected tables.
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Footer Actions */}
              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setStep("capture")}
                  className="rounded-xl border border-[#E5DFD3] bg-white px-4 py-2 text-xs font-bold text-[#736D65] hover:bg-[#FAF7F2] transition"
                >
                  Retake Photos
                </button>

                <button
                  type="button"
                  onClick={handleApply}
                  className="flex items-center gap-2 rounded-xl bg-[#B55234] px-6 py-2.5 text-xs font-bold text-white shadow-md hover:bg-[#9E4328] transition"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Apply to 2D Floor Plan</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
