// src/screens/auth/Signup.tsx
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { GradientHeader } from "@/components/gradient-header/GradientHeader";
import { api } from "@/lib/api";
import type { User } from "@/lib/authClient";
import { getHomePathFor } from "@/lib/authClient";
import { HandHeart, UtensilsCrossed, ArrowLeft } from "lucide-react";
import { Turnstile } from "@marsidev/react-turnstile";

type Role = "DONOR" | "VOLUNTEER";
type Step = "ROLE" | "FORM";

const TURNSTILE_SITE_KEY =
  // import.meta.env.VITE_TURNSTILE_SITE_KEY || "1x00000000000000000000AA";
  "1x00000000000000000000AA";

function RoleTile({
  title,
  subtitle,
  icon: Icon,
  onClick,
}: {
  title: string;
  subtitle: string;
  icon: any;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full rounded-2xl border bg-card/60 hover:bg-card/70 transition-colors p-4 text-left"
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 rounded-xl border bg-background/40 p-2">
          <Icon className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <div className="text-base font-semibold">{title}</div>
          <div className="mt-1 text-sm text-muted-foreground">{subtitle}</div>
        </div>
      </div>
    </button>
  );
}

export default function Signup() {
  const nav = useNavigate();
  const [step, setStep] = useState<Step>("ROLE");
  const [role, setRole] = useState<Role | null>(null);

  // credentials
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");

  // shared
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");

  // donor-only
  const [organization, setOrganization] = useState("");
  const [aadhaarLast4, setAadhaarLast4] = useState("");
  const [consent, setConsent] = useState(false);
  const [idFrontFile, setIdFrontFile] = useState<File | undefined>();
  const [idBackFile, setIdBackFile] = useState<File | undefined>();
  const [foodSafetyCertFile, setFoodSafetyCertFile] = useState<
    File | undefined
  >();

  // volunteer-only
  const [city, setCity] = useState("");
  const [hasVehicle, setHasVehicle] = useState(false);
  const [volAadhaarLast4, setVolAadhaarLast4] = useState("");
  const [volAadhaarConsent, setVolAadhaarConsent] = useState(false);
  const [volunteerIdType, setVolunteerIdType] = useState("");
  const [volunteerIdProofFile, setVolunteerIdProofFile] = useState<
    File | undefined
  >();

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);

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

  const credentialsOk = useMemo(() => {
    if (username.trim().length < 3) return false;
    if (passwordError) return false;
    return true;
  }, [username, passwordError]);

  const phoneError = useMemo(() => {
    if (!phone) return "";
    if (!/^\d+$/.test(phone)) return "Phone number must contain only digits.";
    if (phone.length < 10) return "Phone number must be at least 10 digits.";
    return "";
  }, [phone]);

  const commonOk = useMemo(() => {
    if (fullName.trim().length < 2) return false;
    if (phoneError) return false;
    return true;
  }, [fullName, phoneError]);

  const emailError = useMemo(() => {
    if (!email) return "";
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email) ? "" : "Enter a valid email address.";
  }, [email]);

  const donorAadhaarError = useMemo(() => {
    if (!aadhaarLast4) return "Aadhaar number is required.";
    if (!/^[2-9]\d{11}$/.test(aadhaarLast4))
      return "Aadhaar must be 12 digits and cannot start with 0 or 1.";
    return "";
  }, [aadhaarLast4]);

  const volunteerAadhaarError = useMemo(() => {
    if (!volAadhaarLast4) return "Aadhaar number is required.";
    if (!/^[2-9]\d{11}$/.test(volAadhaarLast4))
      return "Aadhaar must be 12 digits and cannot start with 0 or 1.";
    return "";
  }, [volAadhaarLast4]);

  const donorOk = useMemo(() => {
    return (
      credentialsOk &&
      commonOk &&
      consent &&
      !!idFrontFile &&
      !!idBackFile &&
      !!foodSafetyCertFile &&
      !emailError &&
      !donorAadhaarError
    );
  }, [
    credentialsOk,
    commonOk,
    consent,
    idFrontFile,
    idBackFile,
    foodSafetyCertFile,
    emailError,
    donorAadhaarError,
  ]);

  const volunteerOk = useMemo(() => {
    return (
      credentialsOk &&
      commonOk &&
      volAadhaarConsent &&
      !!volunteerIdType &&
      !!volunteerIdProofFile &&
      !emailError &&
      !volunteerAadhaarError
    );
  }, [
    credentialsOk,
    commonOk,
    volAadhaarConsent,
    volunteerIdType,
    volunteerIdProofFile,
    emailError,
    volunteerAadhaarError,
  ]);

  return (
    <div className="min-h-dvh flex flex-col px-4">
      <div className="pt-4">
        <GradientHeader
          title="Sign up"
          subtitle={
            step === "ROLE"
              ? "Choose your role"
              : role === "DONOR"
                ? "Donor registration"
                : "Volunteer registration"
          }
        />
      </div>

      <div className="flex-1 flex items-center mt-4">
        <Card className="w-full bg-card/60 py-0">
          <CardContent className="p-4 space-y-3">
            {step === "ROLE" ? (
              <>
                <RoleTile
                  title="Donor"
                  subtitle="Post surplus food, add pickup location"
                  icon={UtensilsCrossed}
                  onClick={() => {
                    setRole("DONOR");
                    setStep("FORM");
                  }}
                />
                <RoleTile
                  title="Volunteer"
                  subtitle="Accept pickups, complete delivery checklist"
                  icon={HandHeart}
                  onClick={() => {
                    setRole("VOLUNTEER");
                    setStep("FORM");
                  }}
                />

                <Button
                  variant="secondary"
                  className="w-full rounded-xl h-12"
                  onClick={() => nav("/auth/login")}
                >
                  Back to Login
                </Button>
              </>
            ) : (
              <>
                {/* Back to role */}
                <Button
                  variant="ghost"
                  className="w-full rounded-xl justify-start text-muted-foreground"
                  onClick={() => {
                    setErr(null);
                    setStep("ROLE");
                    setRole(null);
                  }}
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Change role
                </Button>

                {/* Credentials */}
                <div className="text-sm font-medium pt-1">
                  Login credentials
                </div>
                <Input
                  className="rounded-xl"
                  placeholder="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
                <Input
                  className="rounded-xl"
                  placeholder="password (min 4 chars)"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                {passwordError ? (
                  <div className="text-xs text-destructive">
                    {passwordError}
                  </div>
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

                {/* Common */}
                <div className="text-sm font-medium pt-2">Basic details</div>
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

                {/* Role-specific */}
                {role === "DONOR" ? (
                  <>
                    <div className="text-sm font-medium pt-2">
                      Donor details
                    </div>
                    <Input
                      className="rounded-xl"
                      placeholder="organization (optional)"
                      value={organization}
                      onChange={(e) => setOrganization(e.target.value)}
                    />
                    <div className="text-sm font-medium pt-2 text-amber-600">
                      Mandatory verification (Admin will verify before approval)
                    </div>
                    <Input
                      className="rounded-xl"
                      placeholder="Aadhaar number (owner) *"
                      value={aadhaarLast4}
                      onChange={(e) =>
                        setAadhaarLast4(e.target.value.replace(/\D/g, ""))
                      }
                      inputMode="numeric"
                    />
                    {donorAadhaarError ? (
                      <div className="text-xs text-destructive">
                        {donorAadhaarError}
                      </div>
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
                        onChange={(e) =>
                          setFoodSafetyCertFile(e.target.files?.[0])
                        }
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="text-sm font-medium pt-2">
                      Volunteer details
                    </div>
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
                    <div className="text-sm font-medium pt-2 text-amber-600">
                      Mandatory verification (Admin will verify before approval)
                    </div>
                    <Input
                      className="rounded-xl"
                      placeholder="Aadhaar number *"
                      value={volAadhaarLast4}
                      onChange={(e) =>
                        setVolAadhaarLast4(e.target.value.replace(/\D/g, ""))
                      }
                      inputMode="numeric"
                    />
                    {volunteerAadhaarError ? (
                      <div className="text-xs text-destructive">
                        {volunteerAadhaarError}
                      </div>
                    ) : null}
                    <div className="flex items-center gap-2 rounded-xl border bg-background/20 p-3">
                      <Checkbox
                        checked={volAadhaarConsent}
                        onCheckedChange={(v) => setVolAadhaarConsent(!!v)}
                      />
                      <div className="text-sm">
                        I consent to share Aadhaar for verification
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="text-xs text-muted-foreground">
                        Volunteer ID type (e.g. DYFI, NSS, NGO) *
                      </div>
                      <select
                        className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm"
                        value={volunteerIdType}
                        onChange={(e) => setVolunteerIdType(e.target.value)}
                      >
                        <option value="">Select your ID type</option>
                        <option value="DYFI_MEMBER">DYFI / Party member</option>
                        <option value="NSS_VOLUNTEER">NSS volunteer</option>
                        <option value="NGO_COORDINATOR">NGO coordinator</option>
                        <option value="PARTY_MEMBER">Party member</option>
                        <option value="OTHER">Other (specify in proof)</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <div className="text-xs text-muted-foreground">
                        Proof of volunteer ID (ID card / membership) *
                      </div>
                      <Input
                        className="rounded-xl"
                        type="file"
                        accept="image/*,.pdf"
                        onChange={(e) =>
                          setVolunteerIdProofFile(e.target.files?.[0])
                        }
                      />
                    </div>
                  </>
                )}

                {err ? (
                  <div className="text-sm text-destructive">{err}</div>
                ) : null}
                <Turnstile
                  siteKey={TURNSTILE_SITE_KEY}
                  onSuccess={(token) => setToken(token)}
                  onError={() => setToken(null)}
                  onExpire={() => setToken(null)}
                />
                <Button
                  className="w-full rounded-xl h-12"
                  disabled={
                    busy ||
                    !role ||
                    (role === "DONOR" ? !donorOk : !volunteerOk) ||
                    !token
                  }
                  onClick={async () => {
                    if (!role) return;
                    setErr(null);
                    setBusy(true);
                    try {
                      let result: unknown;
                      if (role === "DONOR") {
                        result = await api.auth.registerDonor({
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
                      } else {
                        result = await api.auth.registerVolunteer({
                          username,
                          password,
                          fullName,
                          phone,
                          email: email || undefined,
                          city: city || undefined,
                          hasVehicle,
                          aadhaarLast4: volAadhaarLast4
                            ? volAadhaarLast4.slice(-4)
                            : undefined,
                          aadhaarConsent: volAadhaarConsent,
                          volunteerIdType,
                          volunteerIdProofFile,
                        });
                      }
                      if (
                        typeof result === "object" &&
                        result !== null &&
                        "pending" in result &&
                        (result as { pending?: boolean }).pending
                      ) {
                        nav("/auth/pending", {
                          state: {
                            message:
                              "Your account has been submitted for approval. You will be notified by email when an admin approves it. Then sign in with your credentials.",
                          },
                        });
                        return;
                      }
                      const { user } = await api.auth.login({
                        username,
                        password,
                        token,
                      });
                      nav(getHomePathFor(user as User), { replace: true });
                    } catch (e: unknown) {
                      setErr((e as Error)?.message ?? "Signup failed");
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  {busy ? "Creating account..." : "Create account"}
                </Button>

                <Button
                  variant="secondary"
                  className="w-full rounded-xl h-12"
                  onClick={() => nav("/auth/login")}
                >
                  Back to Login
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mt-2 pb-4 text-center text-xs text-muted-foreground">
        Role-based registration • Demo auth (localStorage)
      </div>
    </div>
  );
}
