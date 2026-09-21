"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Fingerprint, LoaderCircle, ShieldCheck, Smartphone, Trash2 } from "lucide-react";
import { startAuthentication, startRegistration } from "@simplewebauthn/browser";
import { Button } from "@/components/ui";

type PasskeySummary = {
  id: string;
  name: string | null;
  deviceType: string | null;
  backedUp: boolean;
  createdAt: string;
  lastUsedAt: string | null;
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

function isStandaloneApp() {
  if (typeof window === "undefined") {
    return false;
  }

  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

async function supportsPlatformPasskeys() {
  if (typeof window === "undefined" || typeof PublicKeyCredential === "undefined") {
    return false;
  }

  if (typeof PublicKeyCredential.isConditionalMediationAvailable === "function") {
    try {
      await PublicKeyCredential.isConditionalMediationAvailable();
    } catch {
      return false;
    }
  }

  if (typeof PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === "function") {
    try {
      return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    } catch {
      return false;
    }
  }

  return true;
}

export function PasskeyLoginButton({
  onError,
}: {
  onError: (message: string) => void;
}) {
  const router = useRouter();
  const [isSupported, setIsSupported] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  useEffect(() => {
    let active = true;

    void supportsPlatformPasskeys().then((supported) => {
      if (!active) {
        return;
      }

      setIsSupported(supported);
      setIsReady(true);
    });

    return () => {
      active = false;
    };
  }, []);

  if (!isStandaloneApp() || !isReady || !isSupported) {
    return null;
  }

  async function handlePasskeyLogin() {
    setIsAuthenticating(true);
    onError("");

    try {
      const optionsResponse = await fetch("/api/passkeys/authenticate/options", {
        method: "POST",
      });
      const options = await optionsResponse.json();

      if (!optionsResponse.ok) {
        onError(readApiError(JSON.stringify(options), "Unable to start device login."));
        return;
      }

      const response = await startAuthentication({ optionsJSON: options });
      const verifyResponse = await fetch("/api/passkeys/authenticate/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ response }),
      });

      if (!verifyResponse.ok) {
        const raw = await verifyResponse.text();
        onError(readApiError(raw, "Device authentication failed."));
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch (error) {
      const message =
        error instanceof Error && error.name === "NotAllowedError"
          ? "Device authentication was cancelled."
          : "No device login is registered yet. Sign in with your code first, then enable device login in Settings.";
      onError(message);
    } finally {
      setIsAuthenticating(false);
    }
  }

  return (
    <button
      type="button"
      onClick={() => void handlePasskeyLogin()}
      disabled={isAuthenticating}
      className="mt-4 inline-flex h-11 w-full items-center justify-center gap-3 rounded-full border border-slate-200 bg-white px-6 text-sm font-semibold text-slate-900 shadow-[0_12px_30px_rgba(15,23,42,0.08)] transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-70"
    >
      {isAuthenticating ? <LoaderCircle className="h-4.5 w-4.5 animate-spin" /> : <Fingerprint className="h-4.5 w-4.5" />}
      {isAuthenticating ? "Checking device..." : "Use phone authentication"}
    </button>
  );
}

export function PasskeySettingsPanel() {
  const [passkeys, setPasskeys] = useState<PasskeySummary[]>([]);
  const [isSupported, setIsSupported] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function load() {
      const supported = await supportsPlatformPasskeys();
      if (!active) {
        return;
      }

      setIsSupported(supported);
      setIsReady(true);

      if (supported) {
        await refreshPasskeys();
      }
    }

    void load();

    return () => {
      active = false;
    };
  }, []);

  async function refreshPasskeys() {
    const response = await fetch("/api/passkeys");
    const payload = await response.json();

    if (!response.ok) {
      setError(readApiError(JSON.stringify(payload), "Unable to load device login status."));
      return;
    }

    setPasskeys(payload.passkeys as PasskeySummary[]);
  }

  async function handleRegister() {
    setIsRegistering(true);
    setError("");
    setMessage("");

    try {
      const optionsResponse = await fetch("/api/passkeys/register/options", { method: "POST" });
      const options = await optionsResponse.json();

      if (!optionsResponse.ok) {
        setError(readApiError(JSON.stringify(options), "Unable to start device registration."));
        return;
      }

      const response = await startRegistration({ optionsJSON: options });
      const verifyResponse = await fetch("/api/passkeys/register/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ response }),
      });

      if (!verifyResponse.ok) {
        const raw = await verifyResponse.text();
        setError(readApiError(raw, "Device registration failed."));
        return;
      }

      await refreshPasskeys();
      setMessage("Device login is enabled on this phone.");
    } catch (err) {
      setError(
        err instanceof Error && err.name === "NotAllowedError"
          ? "Device registration was cancelled."
          : "Unable to complete device registration on this phone.",
      );
    } finally {
      setIsRegistering(false);
    }
  }

  async function handleRemove(passkeyId: string) {
    setRemovingId(passkeyId);
    setError("");
    setMessage("");

    try {
      const response = await fetch(`/api/passkeys/${encodeURIComponent(passkeyId)}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const raw = await response.text();
        setError(readApiError(raw, "Unable to remove device login."));
        return;
      }

      await refreshPasskeys();
      setMessage("Device login removed.");
    } finally {
      setRemovingId(null);
    }
  }

  return (
    <div className="space-y-3">
      <div className="rounded-[18px] border border-[var(--line)] bg-slate-50/90 p-4">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-900 text-white">
            <ShieldCheck className="h-4.5 w-4.5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-medium text-slate-900">Phone authentication</p>
            <p className="mt-1 text-sm text-slate-500">
              Use Face ID, fingerprint, PIN, or the device screen lock inside the installed app.
            </p>
          </div>
        </div>
      </div>

      {!isReady ? (
        <div className="rounded-[18px] border border-[var(--line)] bg-white px-4 py-4 text-sm text-slate-500">
          Checking device support...
        </div>
      ) : !isSupported ? (
        <div className="rounded-[18px] border border-[var(--line)] bg-white px-4 py-4 text-sm text-slate-500">
          This device does not expose platform passkeys to the app.
        </div>
      ) : !isStandaloneApp() ? (
        <div className="rounded-[18px] border border-[var(--line)] bg-white px-4 py-4 text-sm text-slate-500">
          Open the installed mobile app to register phone authentication on this device.
        </div>
      ) : (
        <>
          <Button type="button" onClick={() => void handleRegister()} disabled={isRegistering}>
            {isRegistering ? "Registering device..." : "Enable on this phone"}
          </Button>

          {passkeys.length ? (
            <div className="space-y-3">
              {passkeys.map((passkey) => (
                <div key={passkey.id} className="rounded-[18px] border border-[var(--line)] bg-white p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <Smartphone className="h-4 w-4 text-slate-500" />
                        <p className="font-medium text-slate-900">{passkey.name || "Registered device"}</p>
                      </div>
                      <p className="mt-1 text-sm text-slate-500">
                        {passkey.deviceType ? `${passkey.deviceType} credential` : "Platform credential"}
                      </p>
                      <p className="mt-1 text-xs text-slate-400">
                        Last used {passkey.lastUsedAt ? new Date(passkey.lastUsedAt).toLocaleString() : "not yet"}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => void handleRemove(passkey.id)}
                      disabled={removingId === passkey.id}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-rose-200 bg-rose-50 text-rose-600 disabled:cursor-not-allowed disabled:opacity-60"
                      aria-label="Remove device login"
                    >
                      {removingId === passkey.id ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </>
      )}

      {message ? (
        <div className="rounded-[18px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {message}
        </div>
      ) : null}
      {error ? (
        <div className="rounded-[18px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}
    </div>
  );
}

