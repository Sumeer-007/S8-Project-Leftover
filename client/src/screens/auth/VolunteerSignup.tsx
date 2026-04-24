import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { GradientHeader } from "@/components/gradient-header/GradientHeader";
import { api } from "@/lib/api";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const VOLUNTEER_ID_TYPES = [
  { value: "DYFI_MEMBER", label: "DYFI / Party member" },
  { value: "NSS_VOLUNTEER", label: "NSS volunteer" },
  { value: "NGO_COORDINATOR", label: "NGO coordinator" },
  { value: "PARTY_MEMBER", label: "Party member" },
  { value: "OTHER", label: "Other (specify in proof)" },
] as const;

export default function VolunteerSignup() {
  const nav = useNavigate();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [hasVehicle, setHasVehicle] = useState(false);

  const [aadhaarLast4, setAadhaarLast4] = useState("");
  const [aadhaarConsent, setAadhaarConsent] = useState(false);
  const [volunteerIdType, setVolunteerIdType] = useState<string>("");
  const [volunteerIdProofFile, setVolunteerIdProofFile] = useState<
    File | undefined
  >();

  const verhoeffD = [
    [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
    [1, 2, 3, 4, 0, 6, 7, 8, 9, 5],
    [2, 3, 4, 0, 1, 7, 8, 9, 5, 6],
    [3, 4, 0, 1, 2, 8, 9, 5, 6, 7],
    [4, 0, 1, 2, 3, 9, 5, 6, 7, 8],
    [5, 9, 8, 7, 6, 0, 4, 3, 2, 1],
    [6, 5, 9, 8, 7, 1, 0, 4, 3, 2],
    [7, 6, 5, 9, 8, 2, 1, 0, 4, 3],
    [8, 7, 6, 5, 9, 3, 2, 1, 0, 4],
    [9, 8, 7, 6, 5, 4, 3, 2, 1, 0],
  ];

  const verhoeffP = [
    [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
    [1, 5, 7, 6, 2, 8, 3, 0, 9, 4],
    [5, 8, 0, 3, 7, 9, 6, 1, 4, 2],
    [8, 9, 1, 6, 0, 4, 3, 5, 2, 7],
    [9, 4, 5, 3, 1, 2, 6, 8, 7, 0],
    [4, 2, 8, 6, 5, 7, 3, 9, 0, 1],
    [2, 7, 9, 3, 8, 0, 6, 4, 1, 5],
    [7, 0, 4, 6, 9, 1, 3, 2, 5, 8],
  ];

  function isValidAadhaar(aadhaar: string): boolean {
    if (!/^[2-9][0-9]{11}$/.test(aadhaar)) return false;
    let c = 0;
    const inverted = aadhaar
      .split("")
      .reverse()
      .map((n) => parseInt(n, 10));
    for (let i = 0; i < inverted.length; i++) {
      c = verhoeffD[c][verhoeffP[i % 8][inverted[i]]];
    }
    return c === 0;
  }

  const passwordError = useMemo(() => {
    if (!password) return "";
    if (password.length < 8) return "Password must be at least 8 characters.";
    if (!/[A-Z]/.test(password))
      return "Password must include at least one uppercase letter.";
    if (!/[a-z]/.test(password))
      return "Password must include at least one lowercase letter.";
    if (!/[0-9]/.test(password))
      return "Password must include at least one number.";
    return "";
  }, [password]);

  const emailError = useMemo(() => {
    if (!email) return "";
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email) ? "" : "Enter a valid email address.";
  }, [email]);

  const phoneError = useMemo(() => {
    if (!phone) return "Phone number is required.";
    if (!/^\d+$/.test(phone)) return "Phone number must contain only digits.";
    if (phone.length < 10) return "Phone number must be at least 10 digits.";
    return "";
  }, [phone]);

  const aadhaarError = useMemo(() => {
    if (!aadhaarLast4) return "Aadhaar number is required.";
    if (!/^[2-9]\d{11}$/.test(aadhaarLast4))
      return "Aadhaar must be 12 digits and cannot start with 0 or 1.";
    return "";
  }, [aadhaarLast4]);

  const formInvalid =
    !username ||
    !password ||
    !fullName ||
    !phone ||
    !aadhaarConsent ||
    !volunteerIdType ||
    !volunteerIdProofFile ||
    !!passwordError ||
    !!emailError ||
    !!phoneError ||
    !!aadhaarError;

  return (
    <div className="space-y-4 ">
      <GradientHeader
        title="Volunteer Registration"
        subtitle="Aadhaar and volunteer ID (e.g. DYFI, NSS, NGO) required. Admin will verify before approval."
      />

      <Card className="bg-card/60">
        <CardContent className="p-4 space-y-3">
          <div className="text-sm font-medium">Login credentials</div>
          <Input
            className="rounded-xl"
            placeholder="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <Input
            className="rounded-xl"
            placeholder="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {passwordError ? (
            <div className="text-xs text-destructive">{passwordError}</div>
          ) : null}
          <Input
            className="rounded-xl"
            placeholder="email (optional, for updates)"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          {emailError ? (
            <div className="text-xs text-destructive">{emailError}</div>
          ) : null}

          <div className="pt-2 text-sm font-medium">Volunteer details</div>
          <Input
            className="rounded-xl"
            placeholder="full name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />
          <Input
            className="rounded-xl"
            placeholder="phone"
            value={phone}
            inputMode="numeric"
            pattern="\d*"
            onChange={(e) => {
              const digitsOnly = e.target.value.replace(/\D/g, "");
              setPhone(digitsOnly);
            }}
          />
          {phoneError ? (
            <div className="text-xs text-destructive">{phoneError}</div>
          ) : null}
          <Input
            className="rounded-xl"
            placeholder="city (optional)"
            value={city}
            onChange={(e) => setCity(e.target.value)}
          />

          <div className="flex items-center gap-2 rounded-xl border bg-background/20 p-3">
            <Checkbox
              checked={hasVehicle}
              onCheckedChange={(v) => setHasVehicle(!!v)}
            />
            <div className="text-sm">I have a vehicle (bike/car)</div>
          </div>

          <div className="pt-2 text-sm font-medium text-amber-600">
            Mandatory verification (Admin will approve after checking)
          </div>
          <Input
            className="rounded-xl"
            placeholder="Aadhaar number *"
            value={aadhaarLast4}
            onChange={(e) => setAadhaarLast4(e.target.value.replace(/\D/g, ""))}
            inputMode="numeric"
          />
          {aadhaarError ? (
            <div className="text-xs text-destructive">{aadhaarError}</div>
          ) : null}
          <div className="flex items-center gap-2 rounded-xl border bg-background/20 p-3">
            <Checkbox
              checked={aadhaarConsent}
              onCheckedChange={(v) => setAadhaarConsent(!!v)}
            />
            <div className="text-sm">
              I consent to share Aadhaar for verification
            </div>
          </div>
          <div className="space-y-2">
            <div className="text-xs text-muted-foreground">
              Volunteer ID type (e.g. DYFI, NSS, NGO) *
            </div>
            <Select value={volunteerIdType} onValueChange={setVolunteerIdType}>
              <SelectTrigger className="rounded-xl">
                <SelectValue placeholder="Select your ID type" />
              </SelectTrigger>
              <SelectContent>
                {VOLUNTEER_ID_TYPES.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <div className="text-xs text-muted-foreground">
              Proof of volunteer ID (ID card / membership) *
            </div>
            <Input
              className="rounded-xl"
              type="file"
              accept="image/*,.pdf"
              onChange={(e) => setVolunteerIdProofFile(e.target.files?.[0])}
            />
          </div>

          {err ? <div className="text-sm text-destructive">{err}</div> : null}

          <Button
            className="w-full rounded-xl"
            disabled={busy || formInvalid}
            onClick={async () => {
              setErr(null);
              setBusy(true);
              try {
                const result = await api.auth.registerVolunteer({
                  username,
                  password,
                  fullName,
                  phone,
                  email: email || undefined,
                  city: city || undefined,
                  hasVehicle,
                  aadhaarLast4: aadhaarLast4
                    ? aadhaarLast4.slice(-4)
                    : undefined,
                  aadhaarConsent: aadhaarConsent,
                  volunteerIdType,
                  volunteerIdProofFile,
                });
                if (
                  typeof result === "object" &&
                  result !== null &&
                  "pending" in result &&
                  result.pending
                ) {
                  nav("/auth/pending", {
                    state: {
                      message:
                        "Volunteer account submitted for approval. You will be notified by email when an admin approves it. Then sign in with your credentials.",
                    },
                  });
                  return;
                }
                nav("/auth/login");
              } catch (e: unknown) {
                setErr((e as Error)?.message ?? "Signup failed");
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? "Creating..." : "Create Volunteer Account"}
          </Button>

          <Button
            variant="secondary"
            className="w-full rounded-xl"
            onClick={() => nav("/auth")}
          >
            Back
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
