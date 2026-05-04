// src/screens/auth/Login.tsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { api } from "@/lib/api";
import { getHomePathFor } from "@/lib/authClient";
import type { User } from "@/lib/authClient";
import { Eye, EyeOff, Lock, User2 } from "lucide-react";
import { Turnstile } from "@marsidev/react-turnstile";
import { setupUserPushNotifications } from "@/services/pushNotification";

const REMEMBER_KEY = "leftoverlink_remember_username_v1";
const TURNSTILE_SITE_KEY =
  import.meta.env.VITE_TURNSTILE_SITE_KEY || "1x00000000000000000000AA";

export default function Login() {
  const nav = useNavigate();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [remember, setRemember] = useState(true);
  const [token, setToken] = useState<string | null>(null);

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem(REMEMBER_KEY);
    if (saved) setUsername(saved);
  }, []);

  const canLogin = useMemo(
    () => username.trim().length >= 3 && password.length >= 4 && !!token,
    [username, password, token],
  );

  const getLocation = (): Promise<{ lat: number; lng: number } | null> =>
    new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve(null);
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) =>
          resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => resolve(null),
        { enableHighAccuracy: false, timeout: 5000, maximumAge: 60000 },
      );
    });

  return (
    <div className="flex min-h-dvh flex-col px-4">
      {/* Hero header with gradient */}
      <div className="pt-12 text-center">
        <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-orange-600 text-4xl shadow-lg shadow-primary/30">
          🥗
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
          Leftover Link
        </h1>
        <p className="mt-2 text-base text-muted-foreground">
          Donate food, reduce waste
        </p>
      </div>

      {/* center - polished card */}
      <div className="flex flex-1 items-center pb-8">
        <Card className="w-full overflow-hidden rounded-3xl border-0 bg-white py-0 shadow-xl shadow-black/10">
          <CardContent className="space-y-5 p-6">
            {/* Title */}
            <div className="space-y-1">
              <div className="text-xl font-bold tracking-tight text-foreground">
                Welcome back
              </div>
              <div className="text-sm text-muted-foreground">
                Sign in to access your dashboard.
              </div>
            </div>

            {/* Username */}
            <div className="space-y-2">
              <div className="text-xs text-muted-foreground">Username</div>
              <div className="relative">
                <User2 className="h-4 w-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  className="rounded-xl pl-9 h-12"
                  placeholder="e.g., donor_anu"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoCapitalize="none"
                  autoCorrect="off"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-2">
              <div className="text-xs text-muted-foreground">Password</div>
              <div className="relative">
                <Lock className="h-4 w-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  className="rounded-xl pl-9 pr-10 h-12"
                  placeholder="min 4 characters"
                  type={showPass ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  onClick={() => setShowPass((s) => !s)}
                >
                  {showPass ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Remember */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={remember}
                  onCheckedChange={(v) => setRemember(!!v)}
                />
                <div className="text-sm text-muted-foreground">
                  Remember username
                </div>
              </div>
            </div>
            <Turnstile
              siteKey={TURNSTILE_SITE_KEY}
              onSuccess={(token) => setToken(token)}
              onError={() => setToken(null)}
              onExpire={() => setToken(null)}
            />

            {/* error */}
            {err ? (
              <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {err}
              </div>
            ) : null}

            {/* actions */}
            <Button
              className="h-12 w-full rounded-xl font-semibold shadow-lg shadow-primary/25"
              disabled={!canLogin || busy}
              onClick={async () => {
                setErr(null);
                setBusy(true);
                try {
                  if (remember)
                    localStorage.setItem(REMEMBER_KEY, username.trim());
                  else localStorage.removeItem(REMEMBER_KEY);

                  const fcmToken = (await setupUserPushNotifications()) || "";
                  const location = await getLocation();
                  const { user } = await api.auth.login({
                    username,
                    password,
                    token: fcmToken,
                    location: location ?? undefined,
                  });

                  nav(getHomePathFor(user as User), { replace: true });
                } catch (e: unknown) {
                  const msg = (e as Error)?.message;
                  if (msg === "pending") {
                    setErr(
                      "Your account is pending approval. You will be notified by email when an admin approves it. Then you can sign in with your credentials.",
                    );
                    return;
                  }
                  if (msg === "rejected") {
                    setErr(
                      "Your account was not approved. Please contact support if you believe this is an error.",
                    );
                    return;
                  }
                  setErr(msg ?? "Login failed");
                } finally {
                  setBusy(false);
                }
              }}
            >
              {busy ? "Logging in..." : "Login"}
            </Button>

            <Button
              variant="outline"
              className="h-12 w-full rounded-xl"
              onClick={() => nav("/auth/signup")}
            >
              Create account (Sign up)
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* bottom */}
      <div className="pb-4 text-center text-xs text-muted-foreground">
        Leftover Link • PWA
      </div>
    </div>
  );
}
