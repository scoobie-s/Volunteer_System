"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Download, Share, Smartphone, SquareCode, X } from "lucide-react";
import { PasskeyLoginButton } from "@/components/passkey-settings";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

function readApiError(raw: string, fallback: string) {
  if (!raw) {
    return fallback;
  }

  try {
    const payload = JSON.parse(raw) as { error?: string };
    return payload.error ?? fallback;
  } catch {
    return fallback;
  }
}

export function LoginForm() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIosModal, setShowIosModal] = useState(false);
  const [showInstallHelpModal, setShowInstallHelpModal] = useState(false);
  const isBrowser = typeof window !== "undefined";
  const isIos = isBrowser && /iPad|iPhone|iPod/.test(window.navigator.userAgent);
  const isStandalone =
    isBrowser &&
    (window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true);

  useEffect(() => {
    function handleBeforeInstallPrompt(event: Event) {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  async function submit() {
    setIsSubmitting(true);
    setError("");

    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });

      if (response.ok) {
        router.push("/dashboard");
        router.refresh();
        return;
      }

      const raw = await response.text();
      setError(readApiError(raw, "Login failed."));
    } catch {
      setError("Login failed.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleInstall() {
    if (isStandalone) {
      return;
    }

    if (installPrompt) {
      await installPrompt.prompt();
      await installPrompt.userChoice;
      setInstallPrompt(null);
      return;
    }

    if (isIos) {
      setShowIosModal(true);
      return;
    }

    setShowInstallHelpModal(true);
  }

  return (
    <>
      <section className="relative z-10 w-full max-w-[470px] rounded-[30px] border border-white/50 bg-white/78 px-8 py-10 text-center shadow-[0_30px_90px_rgba(94,93,145,0.16)] backdrop-blur-xl">
      <div className="mx-auto flex h-20 w-20 items-center justify-center">
        <Image
          src="/crc-logo.svg"
          alt="CRC logo"
          width={80}
          height={80}
          priority
          className="h-20 w-20 object-contain"
        />
      </div>
      <p className="mt-5 text-sm text-slate-500">CRC Volunteer Portal</p>
      <h1 className="mt-2 text-5xl font-semibold tracking-[-0.04em] text-[#0f172a]">Sign in</h1>
      <p className="mt-4 text-sm text-slate-500">Use your assigned portal code to access the system.</p>

      <div className="mt-8 space-y-3 text-left">
        <label className="block text-sm font-medium text-slate-700">Login Code</label>
        <input
          type="password"
          inputMode="numeric"
          pattern="[0-9]*"
          value={code}
          onChange={(event) => {
            setCode(event.target.value.replace(/\D/g, ""));
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              void submit();
            }
          }}
          placeholder="Enter digits only"
          className="h-12 w-full rounded-[18px] border border-[var(--line)] bg-[#273046] px-4 text-sm text-white outline-none placeholder:text-slate-400"
        />
        {error ? <p className="text-sm text-rose-600">{error}</p> : null}
      </div>

      <button
        type="button"
        onClick={() => void submit()}
        disabled={isSubmitting}
        className="mt-8 inline-flex h-11 w-full items-center justify-center gap-3 rounded-full bg-[linear-gradient(90deg,#5831ff,#3d21db)] px-6 text-sm font-semibold text-white shadow-[0_18px_40px_rgba(76,56,255,0.28)] transition hover:scale-[1.01] hover:shadow-[0_22px_50px_rgba(76,56,255,0.34)] disabled:cursor-not-allowed disabled:opacity-70"
      >
        <span className="flex h-5 w-5 items-center justify-center rounded-[4px] bg-[conic-gradient(from_45deg,#ff7a00_0_25%,#00c2ff_25%_50%,#38d16a_50%_75%,#ff3bbd_75%_100%)]">
          <SquareCode className="h-3.5 w-3.5 text-white" />
        </span>
        {isSubmitting ? "Checking Code..." : "Login with Code"}
      </button>
      <PasskeyLoginButton onError={setError} />

        {!isStandalone ? (
          <button
            type="button"
            onClick={() => void handleInstall()}
            className="mx-auto mt-8 flex h-12 w-12 items-center justify-center rounded-full bg-[#171717] text-white shadow-[0_12px_30px_rgba(15,23,42,0.18)]"
            aria-label="Install app"
          >
            <Download className="h-4.5 w-4.5" />
          </button>
        ) : null}
      </section>

      {showIosModal ? (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-slate-950/20 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-[24px] border border-white/60 bg-white p-5 text-left shadow-[0_24px_80px_rgba(15,23,42,0.18)]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-lg font-semibold tracking-[-0.03em] text-slate-900">
                  Install on iPhone
                </p>
                <p className="mt-2 text-sm text-slate-600">
                  Add this portal to your home screen for an app-like experience.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowIosModal(false)}
                className="rounded-full border border-[var(--line)] bg-white p-2 text-slate-700"
                aria-label="Close install instructions"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-5 space-y-3 rounded-[20px] border border-[var(--line)] bg-slate-50 p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-sky-100 text-sky-700">
                  <Share className="h-4 w-4" />
                </div>
                <p className="text-sm text-slate-700">1. Tap the Share button in Safari.</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                  <Smartphone className="h-4 w-4" />
                </div>
                <p className="text-sm text-slate-700">2. Choose Add to Home Screen.</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-violet-100 text-violet-700">
                  <Download className="h-4 w-4" />
                </div>
                <p className="text-sm text-slate-700">3. Tap Add to install the portal.</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowIosModal(false)}
              className="mt-5 inline-flex w-full items-center justify-center rounded-full bg-slate-900 px-5 py-3 text-sm font-medium text-white"
            >
              Close
            </button>
          </div>
        </div>
      ) : null}

      {showInstallHelpModal ? (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-slate-950/20 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-[24px] border border-white/60 bg-white p-5 text-left shadow-[0_24px_80px_rgba(15,23,42,0.18)]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-lg font-semibold tracking-[-0.03em] text-slate-900">
                  Install the Portal
                </p>
                <p className="mt-2 text-sm text-slate-600">
                  Your browser has not exposed the direct install prompt yet. You can still install
                  the portal from the browser menu.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowInstallHelpModal(false)}
                className="rounded-full border border-[var(--line)] bg-white p-2 text-slate-700"
                aria-label="Close install help"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-5 space-y-3 rounded-[20px] border border-[var(--line)] bg-slate-50 p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-sky-100 text-sky-700">
                  <Download className="h-4 w-4" />
                </div>
                <p className="text-sm text-slate-700">
                  1. Open the browser menu on Chrome or Edge.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                  <Smartphone className="h-4 w-4" />
                </div>
                <p className="text-sm text-slate-700">
                  2. Choose Install app, Add to desktop, or Create shortcut.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-violet-100 text-violet-700">
                  <Share className="h-4 w-4" />
                </div>
                <p className="text-sm text-slate-700">
                  3. If the option is missing, refresh once and try again after the page fully loads.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowInstallHelpModal(false)}
              className="mt-5 inline-flex w-full items-center justify-center rounded-full bg-slate-900 px-5 py-3 text-sm font-medium text-white"
            >
              Close
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
