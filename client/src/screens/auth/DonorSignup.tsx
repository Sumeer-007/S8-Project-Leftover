import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { GradientHeader } from "@/components/gradient-header/GradientHeader";
import { api } from "@/lib/api";

export default function DonorSignup() {
  const nav = useNavigate();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [organization, setOrganization] = useState("");

  const [aadhaarLast4, setAadhaarLast4] = useState("");
  const [consent, setConsent] = useState(false);

  const [idFrontFile, setIdFrontFile] = useState<File | undefined>();
  const [idBackFile, setIdBackFile] = useState<File | undefined>();
  const [foodSafetyCertFile, setFoodSafetyCertFile] = useState<
    File | undefined
  >();

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
    if (!/^\d{12}$/.test(aadhaarLast4))
      return "Aadhaar number must be 12 digits.";
    if (!/^[2-9][0-9]{11}$/.test(aadhaarLast4))
      return "Aadhaar number must be 12 digits and cannot start with 0 or 1.";
    return "";
  }, [aadhaarLast4]);

  const formInvalid =
    !username ||
    !password ||
    !fullName ||
    !phone ||
    !consent ||
    !idFrontFile ||
    !idBackFile ||
    !foodSafetyCertFile ||
    !!passwordError ||
    !!emailError ||
    !!phoneError ||
    !!aadhaarError;

  return (
    <div className="space-y-4">
      <GradientHeader
        title="Donor Registration"
        subtitle="Restaurants & hotels: Aadhaar (owner) and food safety certificate required. Admin will verify before approval."
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

          <div className="pt-2 text-sm font-medium">Donor details</div>
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
            placeholder="organization (optional)"
            value={organization}
            onChange={(e) => setOrganization(e.target.value)}
          />

          <div className="pt-2 text-sm font-medium text-amber-600">
            Mandatory verification (Admin will approve after checking)
          </div>
          <Input
            className="rounded-xl"
            placeholder="Aadhaar number (owner) *"
            value={aadhaarLast4}
            onChange={(e) => setAadhaarLast4(e.target.value.replace(/\D/g, ""))}
            inputMode="numeric"
          />
          {aadhaarError ? (
            <div className="text-xs text-destructive">{aadhaarError}</div>
          ) : null}

          <div className="flex items-center gap-2 rounded-xl border bg-background/20 p-3">
            <Checkbox
              checked={consent}
              onCheckedChange={(v) => setConsent(!!v)}
            />
            <div className="text-sm">
              I consent to share Aadhaar (owner) for verification
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <div className="text-xs text-muted-foreground">
                Aadhaar front (owner) *
              </div>
              <Input
                className="rounded-xl"
                type="file"
                accept="image/*"
                onChange={(e) => setIdFrontFile(e.target.files?.[0])}
              />
            </div>
            <div className="space-y-2">
              <div className="text-xs text-muted-foreground">
                Aadhaar back (owner) *
              </div>
              <Input
                className="rounded-xl"
                type="file"
                accept="image/*"
                onChange={(e) => setIdBackFile(e.target.files?.[0])}
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-xs text-muted-foreground">
              Food safety / health certificate *
            </div>
            <Input
              className="rounded-xl"
              type="file"
              accept="image/*,.pdf"
              onChange={(e) => setFoodSafetyCertFile(e.target.files?.[0])}
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
                const result = await api.auth.registerDonor({
                  username,
                  password,
                  fullName,
                  phone,
                  email: email || undefined,
                  organization: organization || undefined,
                  aadhaarLast4: aadhaarLast4
                    ? aadhaarLast4.slice(-4)
                    : undefined,
                  aadhaarConsent: consent,
                  idFrontFile,
                  idBackFile,
                  foodSafetyCertFile,
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
                        "Donor account submitted for approval. You will be notified by email when an admin approves it. Then sign in with your credentials.",
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
            {busy ? "Creating..." : "Create Donor Account"}
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
