"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { Scanner, type IScannerError } from "@yudiel/react-qr-scanner";
import { Camera, RefreshCw, ScanQrCode, SwitchCamera } from "lucide-react";
import { Button, Input, Select } from "@/components/ui";
import type { AccessPoint, Event } from "@/lib/types";

type Result = {
  ok: boolean;
  mode: "attendance" | "access";
  status: string;
  message: string;
  details?: string;
  volunteer?: {
    fullName: string;
    sectionName: string;
    photoDataUrl?: string;
  };
} | null;

type CameraDevice = {
  deviceId: string;
  label: string;
};

function readApiPayload(raw: string) {
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as Result | { error?: string };
  } catch {
    return null;
  }
}

function getAudioContextClass() {
  if (typeof window === "undefined") {
    return null;
  }

  return (
    window.AudioContext ||
    (window as typeof window & {
      webkitAudioContext?: typeof AudioContext;
    }).webkitAudioContext ||
    null
  );
}

async function ensureAudioContext(contextRef: React.MutableRefObject<AudioContext | null>) {
  const AudioContextClass = getAudioContextClass();
  if (!AudioContextClass) {
    return null;
  }

  if (!contextRef.current || contextRef.current.state === "closed") {
    contextRef.current = new AudioContextClass();
  }

  if (contextRef.current.state === "suspended") {
    await contextRef.current.resume();
  }

  return contextRef.current;
}

function playToneSequence(
  context: AudioContext,
  frequencies: number[],
  durationMs: number,
  type: OscillatorType,
) {
  const gainNode = context.createGain();
  gainNode.gain.setValueAtTime(0.0001, context.currentTime);
  gainNode.connect(context.destination);

  const segmentDuration = durationMs / 1000;

  frequencies.forEach((frequency, index) => {
    const oscillator = context.createOscillator();
    const startAt = context.currentTime + index * segmentDuration;
    const endAt = startAt + segmentDuration;

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, startAt);
    oscillator.connect(gainNode);

    gainNode.gain.setValueAtTime(0.0001, startAt);
    gainNode.gain.exponentialRampToValueAtTime(0.11, startAt + 0.02);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, endAt);

    oscillator.start(startAt);
    oscillator.stop(endAt);
  });

}

export function ScannerClient({
  events,
  accessPoints,
}: {
  events: Event[];
  accessPoints: AccessPoint[];
}) {
  const today = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }, []);

  const upcomingEvents = useMemo(
    () =>
      events
        .filter(
          (item): item is Event =>
            Boolean(item && typeof item.date === "string" && typeof item.startTime === "string"),
        )
        .filter((item) => item.date >= today)
        .sort((left, right) =>
          `${left.date}T${left.startTime}`.localeCompare(`${right.date}T${right.startTime}`),
        ),
    [events, today],
  );

  const [mode, setMode] = useState<"attendance" | "access">("attendance");
  const [token, setToken] = useState("");
  const [eventId, setEventId] = useState("");
  const [accessPointId, setAccessPointId] = useState(accessPoints[0]?.id ?? "");
  const [result, setResult] = useState<Result>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [scannerEnabled, setScannerEnabled] = useState(false);
  const [cameraFacingMode, setCameraFacingMode] = useState<"environment" | "user">("environment");
  const [cameraDevices, setCameraDevices] = useState<CameraDevice[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState("");
  const [isDesktopCameraMode, setIsDesktopCameraMode] = useState(false);
  const [scannerInstanceKey, setScannerInstanceKey] = useState(0);
  const [lastScannedToken, setLastScannedToken] = useState("");
  const [isPending, startTransition] = useTransition();
  const cooldownUntilRef = useRef(0);
  const lastAudioSignatureRef = useRef("");
  const audioContextRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const mediaQuery = window.matchMedia("(pointer: coarse)");
    const syncMode = () => setIsDesktopCameraMode(!mediaQuery.matches);
    syncMode();

    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", syncMode);
      return () => mediaQuery.removeEventListener("change", syncMode);
    }

    mediaQuery.addListener(syncMode);
    return () => mediaQuery.removeListener(syncMode);
  }, []);

  useEffect(() => {
    async function loadCameraDevices() {
      if (typeof navigator === "undefined" || !navigator.mediaDevices?.enumerateDevices) {
        return;
      }

      const devices = await navigator.mediaDevices.enumerateDevices();
      const cameras = devices
        .filter((device) => device.kind === "videoinput")
        .map((device, index) => ({
          deviceId: device.deviceId,
          label: device.label || `Camera ${index + 1}`,
        }));

      setCameraDevices(cameras);
      setSelectedDeviceId((current) =>
        current && cameras.some((device) => device.deviceId === current)
          ? current
          : (cameras[0]?.deviceId ?? ""),
      );
    }

    void loadCameraDevices();
  }, [scannerEnabled, scannerInstanceKey]);

  useEffect(() => {
    const audioContext = audioContextRef.current;
    return () => {
      if (audioContext && audioContext.state !== "closed") {
        void audioContext.close();
      }
    };
  }, []);

  useEffect(() => {
    if (!result?.status || !token) {
      return;
    }

    const audioSignature = `${token}:${result.status}:${result.mode}`;
    if (lastAudioSignatureRef.current === audioSignature) {
      return;
    }

    if (result.status === "GRANTED" || result.status === "PRESENT") {
      lastAudioSignatureRef.current = audioSignature;
      void ensureAudioContext(audioContextRef).then((context) => {
        if (context) {
          playToneSequence(context, [880, 1174], 120, "sine");
        }
      });
      return;
    }

    if (result.status === "DENIED" || result.status === "DUPLICATE") {
      lastAudioSignatureRef.current = audioSignature;
      void ensureAudioContext(audioContextRef).then((context) => {
        if (context) {
          playToneSequence(context, [420, 260], 170, "sawtooth");
        }
      });
    }
  }, [result, token]);

  const activeEventId =
    upcomingEvents.some((item) => item.id === eventId) ? eventId : (upcomingEvents[0]?.id ?? "");
  const modeTheme =
    mode === "attendance"
      ? {
          frame: "bg-[linear-gradient(180deg,#ecfeff,#f8fafc)]",
          overlay: "bg-[linear-gradient(180deg,rgba(236,254,255,0.96),rgba(248,250,252,0.96))]",
          activeChip: "bg-cyan-100",
        }
      : {
          frame: "bg-[linear-gradient(180deg,#fff7ed,#f8fafc)]",
          overlay: "bg-[linear-gradient(180deg,rgba(255,247,237,0.96),rgba(248,250,252,0.96))]",
          activeChip: "bg-amber-100",
        };
  const volunteerStatusLabel =
    result?.status === "GRANTED"
      ? "Granted"
      : result?.status === "DENIED"
        ? "Rejected"
        : result?.status === "PRESENT"
          ? "Checked In"
          : result?.status ?? "";

  async function submit(scanToken: string) {
    const normalizedToken = scanToken.trim();
    if (!normalizedToken) {
      return;
    }

    if (mode === "attendance" && !activeEventId) {
      setResult({
        ok: false,
        mode: "attendance",
        status: "DENIED",
        message: "Select an upcoming event before scanning attendance.",
      });
      return;
    }

    if (mode === "access" && !accessPointId) {
      setResult({
        ok: false,
        mode: "access",
        status: "DENIED",
        message: "Select an access point before scanning.",
      });
      return;
    }

    startTransition(async () => {
      try {
        const response = await fetch("/api/scan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            mode === "attendance"
              ? { mode, token: normalizedToken, eventId: activeEventId }
              : { mode, token: normalizedToken, accessPointId },
          ),
        });

        const raw = await response.text();
        const payload = readApiPayload(raw);

        if (!response.ok) {
          setResult({
            ok: false,
            mode,
            status: "DENIED",
            message:
              payload && "error" in payload && payload.error
                ? payload.error
                : "Scan failed. Please try again.",
          });
          return;
        }

        setResult(
          payload && "ok" in payload
            ? payload
            : {
                ok: false,
                mode,
                status: "DENIED",
                message: "Scan failed. Please try again.",
              },
        );
        setToken(normalizedToken);
        setLastScannedToken(normalizedToken);
      } catch {
        setResult({
          ok: false,
          mode,
          status: "DENIED",
          message: "Scanner response was invalid. Please try again.",
        });
      }
    });
  }

  function handleScannedValue(scanned: string | undefined) {
    if (!scanned) {
      return;
    }

    const now = Date.now();
    if (scanned === lastScannedToken && now < cooldownUntilRef.current) {
      return;
    }

    cooldownUntilRef.current = now + 1800;
    setCameraError(null);
    void submit(scanned);
  }

  function startScanner() {
    setCameraError(null);
    setScannerEnabled(true);
    setScannerInstanceKey((current) => current + 1);
    void ensureAudioContext(audioContextRef);
  }

  function retryScanner(nextFacingMode?: "environment" | "user") {
    setCameraError(null);
    setScannerEnabled(true);
    if (nextFacingMode) {
      setCameraFacingMode(nextFacingMode);
    }
    setScannerInstanceKey((current) => current + 1);
  }

  function refreshScanner() {
    setResult(null);
    setToken("");
    setLastScannedToken("");
    cooldownUntilRef.current = 0;
    retryScanner();
  }

  function toggleCameraFacingMode() {
    if (isDesktopCameraMode && cameraDevices.length > 1) {
      const currentIndex = cameraDevices.findIndex((device) => device.deviceId === selectedDeviceId);
      const nextDevice = cameraDevices[(currentIndex + 1 + cameraDevices.length) % cameraDevices.length];
      setSelectedDeviceId(nextDevice?.deviceId ?? "");
      retryScanner();
      return;
    }

    retryScanner(cameraFacingMode === "environment" ? "user" : "environment");
  }

  function handleCameraError(error: IScannerError) {
    if (error.kind === "overconstrained" && isDesktopCameraMode && cameraDevices.length > 1) {
      toggleCameraFacingMode();
      return;
    }

    if (error.kind === "overconstrained" && cameraFacingMode === "environment") {
      retryScanner("user");
      return;
    }

    const messageByKind: Record<IScannerError["kind"], string> = {
      "permission-denied": "Camera permission was denied. Allow camera access in the browser and try again.",
      "no-camera": "No camera was detected on this device.",
      "in-use": "The camera is already being used by another app or browser tab.",
      overconstrained: "The selected camera is not available. Try switching to the other camera.",
      "insecure-context": "Camera access requires a secure context such as localhost or HTTPS.",
      unsupported: "This browser does not support live camera scanning.",
      aborted: "Camera startup was interrupted. Try starting the scanner again.",
      security: "Browser security settings blocked the camera.",
      "type-error": "Camera configuration failed. Try switching the camera and retrying.",
      unknown: error.message || "Camera access failed. Try again.",
    };

    setCameraError(messageByKind[error.kind] ?? error.message);
  }

  const scannerConstraints = useMemo<MediaTrackConstraints>(() => {
    if (isDesktopCameraMode) {
      return selectedDeviceId
        ? {
            deviceId: { exact: selectedDeviceId },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          }
        : {
            width: { ideal: 1280 },
            height: { ideal: 720 },
          };
    }

    return {
      facingMode: cameraFacingMode,
      width: { ideal: 1280 },
      height: { ideal: 720 },
    };
  }, [cameraFacingMode, isDesktopCameraMode, selectedDeviceId]);

      return (
        <div className="grid gap-6 lg:grid-cols-[1.3fr_0.9fr]">
          <div className="order-1 lg:hidden">
            {mode === "attendance" ? (
              <div>
                <p className="mb-2 text-sm font-medium text-slate-900">Service / Event</p>
                <Select
                  value={activeEventId}
                  onChange={(event) => setEventId(event.target.value)}
                  disabled={!upcomingEvents.length}
                >
                  {upcomingEvents.length ? (
                    upcomingEvents.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name} {item.sundayService !== "NONE" ? `- ${item.sundayService}` : ""}
                      </option>
                    ))
                  ) : (
                    <option value="">No upcoming events</option>
                  )}
                </Select>
              </div>
            ) : (
              <div>
                <p className="mb-2 text-sm font-medium text-slate-900">Access Point</p>
                <Select
                  value={accessPointId}
                  onChange={(event) => setAccessPointId(event.target.value)}
                >
                  {accessPoints.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </Select>
              </div>
            )}
          </div>

      <div className="order-3 space-y-4 lg:order-2">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.25em] text-[var(--muted)]">
            Scanner Mode
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2 rounded-full border border-[var(--line)] bg-white p-1">
            <button
              className={`rounded-full px-4 py-2 text-sm text-slate-900 ${
                mode === "attendance" ? modeTheme.activeChip : ""
              }`}
              onClick={() => setMode("attendance")}
              type="button"
            >
              Entrance
            </button>
            <button
              className={`rounded-full px-4 py-2 text-sm text-slate-900 ${
                mode === "access" ? modeTheme.activeChip : ""
              }`}
              onClick={() => setMode("access")}
              type="button"
            >
              Access
            </button>
          </div>
        </div>

        <div className="hidden lg:block">
          {mode === "attendance" ? (
            <div>
              <p className="mb-2 text-sm font-medium text-slate-900">Service / Event</p>
              <Select
                value={activeEventId}
                onChange={(event) => setEventId(event.target.value)}
                disabled={!upcomingEvents.length}
              >
                {upcomingEvents.length ? (
                  upcomingEvents.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name} {item.sundayService !== "NONE" ? `- ${item.sundayService}` : ""}
                    </option>
                  ))
                ) : (
                  <option value="">No upcoming events</option>
                )}
              </Select>
            </div>
          ) : (
            <div>
              <p className="mb-2 text-sm font-medium text-slate-900">Access Point</p>
              <Select
                value={accessPointId}
                onChange={(event) => setAccessPointId(event.target.value)}
              >
                {accessPoints.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </Select>
            </div>
          )}
        </div>

        {isDesktopCameraMode && cameraDevices.length > 0 ? (
          <div>
            <p className="mb-2 text-sm font-medium text-slate-900">Camera</p>
            <Select
              value={selectedDeviceId}
              onChange={(event) => {
                setSelectedDeviceId(event.target.value);
                if (scannerEnabled) {
                  retryScanner();
                }
              }}
            >
              {cameraDevices.map((device) => (
                <option key={device.deviceId} value={device.deviceId}>
                  {device.label}
                </option>
              ))}
            </Select>
          </div>
        ) : null}

        <div>
          <p className="mb-2 text-sm font-medium text-slate-900">Manual QR Token</p>
          <div className="flex gap-2">
            <Input value={token} onChange={(event) => setToken(event.target.value)} />
            <Button
              type="button"
              disabled={isPending || token.trim().length < 3}
              onClick={() => void submit(token)}
            >
              Scan
            </Button>
          </div>
        </div>

        <div className="rounded-[28px] border border-[var(--line)] bg-white p-5">
          <div className="flex items-center gap-3">
            <ScanQrCode className="h-5 w-5 text-[var(--accent)]" />
            <p className="text-sm font-semibold text-slate-900">Real-time feedback</p>
          </div>
          {cameraError ? (
            <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              <div className="flex items-center gap-2 font-medium">
                <Camera className="h-4 w-4" />
                Camera unavailable
              </div>
              <p className="mt-2">{cameraError}</p>
            </div>
          ) : null}
          <p className="mt-3 text-sm text-slate-600">
            {result?.message ??
              "Scan a volunteer badge or paste a QR token to test the entrance or access flow."}
          </p>
          {result?.volunteer ? (
            <div className="mt-4 flex items-center gap-4 rounded-[24px] border border-slate-200 bg-slate-50 p-4">
              <div className="h-20 w-20 overflow-hidden rounded-[20px] border border-slate-200 bg-white">
                {result.volunteer.photoDataUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={result.volunteer.photoDataUrl}
                    alt={result.volunteer.fullName}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-slate-100 text-lg font-semibold text-slate-700">
                    {result.volunteer.fullName
                      .split(" ")
                      .map((part) => part[0] ?? "")
                      .join("")
                      .slice(0, 2)}
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-base font-semibold text-slate-900">{result.volunteer.fullName}</p>
                  <span
                    className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                      result.status === "GRANTED" || result.status === "PRESENT"
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-rose-100 text-rose-700"
                    }`}
                  >
                    {volunteerStatusLabel}
                  </span>
                </div>
                <p className="mt-1 text-sm text-slate-600">{result.volunteer.sectionName}</p>
              </div>
            </div>
          ) : null}
          {result?.details ? (
            <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
              {result.details}
            </div>
          ) : null}
          {result ? (
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <div
                className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                  result.ok
                    ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                    : "bg-rose-500/15 text-rose-700 dark:text-rose-300"
                }`}
              >
                {result.status}
              </div>
              <Button
                type="button"
                className="h-8 border border-slate-300 bg-white px-3 text-xs text-slate-700 hover:bg-slate-50"
                onClick={refreshScanner}
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh Scanner
              </Button>
            </div>
          ) : null}
        </div>
      </div>

      <div
        className={`order-1 relative overflow-hidden rounded-[28px] border border-[var(--line)] p-3 transition-colors lg:order-1 ${modeTheme.frame}`}
      >
        <Scanner
          key={scannerInstanceKey}
          onScan={(codes) => {
            handleScannedValue(codes[0]?.rawValue);
          }}
          onError={handleCameraError}
          paused={!scannerEnabled}
          styles={{ container: { borderRadius: 24, overflow: "hidden" } }}
          constraints={scannerConstraints}
          startTimeoutMs={5000}
          retryDelay={250}
          sound={false}
        />

        {!scannerEnabled ? (
          <div
            className={`absolute inset-3 flex flex-col items-center justify-start rounded-[24px] px-6 pt-12 text-center backdrop-blur-sm ${modeTheme.overlay}`}
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-900">
              <Camera className="h-6 w-6" />
            </div>
            <p className="mt-4 text-lg font-semibold text-slate-900">Start camera scanner</p>
            <p className="mt-2 max-w-sm text-sm text-slate-700">
              Open the volunteer scanner camera here for entrance and access QR codes.
            </p>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
              <Button type="button" onClick={startScanner}>
                Start Camera
              </Button>
              <button
                type="button"
                onClick={toggleCameraFacingMode}
                className="inline-flex items-center gap-2 rounded-full border border-[var(--line)] bg-white px-4 py-2 text-sm font-medium text-slate-900 transition hover:bg-slate-50"
              >
                <SwitchCamera className="h-4 w-4" />
                {isDesktopCameraMode
                  ? cameraDevices.length > 1
                    ? "Switch Camera"
                    : "Use Built-in Camera"
                  : `Use ${cameraFacingMode === "environment" ? "Front" : "Back"} Camera`}
              </button>
            </div>
          </div>
        ) : null}

        {scannerEnabled && cameraError ? (
          <div
            className={`absolute inset-3 flex flex-col items-center justify-start rounded-[24px] px-6 pt-12 text-center backdrop-blur-sm ${modeTheme.overlay}`}
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-rose-100 text-rose-600">
              <Camera className="h-6 w-6" />
            </div>
            <p className="mt-4 text-lg font-semibold text-slate-900">Camera unavailable</p>
            <p className="mt-2 max-w-sm text-sm text-slate-700">{cameraError}</p>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
              <Button type="button" onClick={() => retryScanner()}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Retry Camera
              </Button>
              <button
                type="button"
                onClick={toggleCameraFacingMode}
                className="inline-flex items-center gap-2 rounded-full border border-[var(--line)] bg-white px-4 py-2 text-sm font-medium text-slate-900 transition hover:bg-slate-50"
              >
                <SwitchCamera className="h-4 w-4" />
                {isDesktopCameraMode ? "Switch Camera" : "Use Other Camera"}
              </button>
            </div>
          </div>
        ) : null}
      </div>

      {result?.volunteer ? (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-slate-950/25 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-[28px] border border-white/60 bg-white p-6 shadow-[0_24px_80px_rgba(15,23,42,0.22)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-slate-500">
                  Scan Result
                </p>
                <p className="mt-2 text-2xl font-semibold text-slate-900">
                  {result.status === "GRANTED" || result.status === "PRESENT" ? "Granted" : "Denied"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setResult(null)}
                className="rounded-full border border-[var(--line)] bg-white p-3 text-slate-700"
                aria-label="Close result popup"
              >
                <span className="text-sm leading-none">x</span>
              </button>
            </div>

            <div className="mt-5 flex items-center gap-4 rounded-[24px] border border-[var(--line)] bg-slate-50 p-4">
              <div className="h-24 w-24 overflow-hidden rounded-[22px] border border-slate-200 bg-white">
                {result.volunteer.photoDataUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={result.volunteer.photoDataUrl}
                    alt={result.volunteer.fullName}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-slate-100 text-xl font-semibold text-slate-700">
                    {result.volunteer.fullName
                      .split(" ")
                      .map((part) => part[0] ?? "")
                      .join("")
                      .slice(0, 2)}
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <p className="text-lg font-semibold text-slate-900">{result.volunteer.fullName}</p>
                <p className="mt-1 text-sm text-slate-600">{result.volunteer.sectionName}</p>
                <span
                  className={`mt-3 inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                    result.status === "GRANTED" || result.status === "PRESENT"
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-rose-100 text-rose-700"
                  }`}
                >
                  {volunteerStatusLabel}
                </span>
              </div>
            </div>

            <p className="mt-4 text-sm text-slate-700">{result.message}</p>
            {result.details ? (
              <div className="mt-3 rounded-[18px] border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                {result.details}
              </div>
            ) : null}

            <div className="mt-5 flex flex-wrap justify-end gap-3">
              <Button
                type="button"
                className="border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                onClick={() => setResult(null)}
              >
                Close
              </Button>
              <Button type="button" onClick={refreshScanner}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Scan Next
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
