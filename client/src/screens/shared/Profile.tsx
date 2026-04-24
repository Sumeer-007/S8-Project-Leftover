import { useNavigate } from "react-router-dom";
import { GradientHeader } from "@/components/gradient-header/GradientHeader";
import { Button } from "@/components/ui/button";
import { getCurrentUserSync } from "@/lib/authClient";
import {
  User,
  Phone,
  Building2,
  Shield,
  MapPin,
  Car,
  Calendar,
  Settings,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

function getDonorName(
  donor: { fullName?: string; full_name?: string } | null | undefined,
): string {
  if (!donor) return "";
  return (
    (donor as { fullName?: string; full_name?: string }).fullName ??
    (donor as { full_name?: string }).full_name ??
    ""
  );
}

function getVolunteerName(
  vol: { fullName?: string; full_name?: string } | null | undefined,
): string {
  if (!vol) return "";
  return (
    (vol as { fullName?: string; full_name?: string }).fullName ??
    (vol as { full_name?: string }).full_name ??
    ""
  );
}

export default function Profile() {
  const nav = useNavigate();
  const user = getCurrentUserSync();

  if (!user) {
    return (
      <div className="space-y-6">
        <GradientHeader
          title="Profile"
          subtitle="Sign in to view your account"
        />
        <div className="rounded-2xl bg-white p-10 text-center shadow-lg shadow-black/5 ring-1 ring-black/5">
          <div className="mb-4 inline-flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 text-4xl">
            👤
          </div>
          <p className="text-base font-semibold text-foreground">
            Not signed in
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Create an account or log in to continue.
          </p>
          <Button
            className="mt-6 rounded-xl font-semibold shadow-lg shadow-primary/20"
            onClick={() => nav("/auth/login")}
          >
            Sign in
          </Button>
        </div>
      </div>
    );
  }

  const isDonor = user.role === "DONOR";
  const donor = isDonor ? user.donor : undefined;
  const volunteer = user.role === "VOLUNTEER" ? user.volunteer : undefined;
  const displayName = isDonor
    ? getDonorName(donor)
    : getVolunteerName(volunteer);
  const initials =
    displayName
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) ||
    user.username[0]?.toUpperCase() ||
    "?";

  return (
    <div className="space-y-6">
      <GradientHeader title="Profile" subtitle={`@${user.username}`} />

      {/* Hero profile card */}
      <div className="overflow-hidden rounded-2xl bg-white shadow-lg shadow-black/5 ring-1 ring-black/5">
        <div className="bg-gradient-to-br from-primary/10 via-orange-50/50 to-transparent px-6 pt-6 pb-4">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-primary text-xl font-bold text-white shadow-lg shadow-primary/30">
              {initials}
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight text-foreground">
                {displayName || user.username}
              </h2>
              <span
                className={cn(
                  "mt-1 inline-block rounded-full px-3 py-0.5 text-xs font-semibold",
                  isDonor
                    ? "bg-primary/15 text-primary"
                    : "bg-emerald-100 text-emerald-700",
                )}
              >
                {isDonor ? "Donor" : "Volunteer"}
              </span>
            </div>
          </div>
        </div>

        <div className="divide-y divide-stone-100 px-6 py-2">
          <InfoRow
            icon={Calendar}
            label="Joined"
            value={new Date(user.createdAt).toLocaleDateString()}
          />
          {isDonor && donor ? (
            <>
              <InfoRow
                icon={User}
                label="Full name"
                value={getDonorName(donor) || "—"}
              />
              <InfoRow
                icon={Phone}
                label="Phone"
                value={(donor as { phone?: string }).phone || "—"}
              />
              {(donor as { organization?: string }).organization && (
                <InfoRow
                  icon={Building2}
                  label="Organization"
                  value={(donor as { organization?: string }).organization!}
                />
              )}
              <InfoRow
                icon={Shield}
                label="Verification"
                value={
                  (donor as { aadhaarLast4?: string }).aadhaarLast4
                    ? `Aadhaar •••• ${(donor as { aadhaarLast4?: string }).aadhaarLast4}`
                    : "Not verified"
                }
              />
              {((donor as { idFrontImage?: string }).idFrontImage ||
                (donor as { idBackImage?: string }).idBackImage) && (
                <div className="flex gap-3 py-3">
                  {(donor as { idFrontImage?: string }).idFrontImage && (
                    <img
                      src={(donor as { idFrontImage?: string }).idFrontImage}
                      alt="ID front"
                      className="h-24 rounded-xl border object-cover shadow-sm"
                    />
                  )}
                  {(donor as { idBackImage?: string }).idBackImage && (
                    <img
                      src={(donor as { idBackImage?: string }).idBackImage}
                      alt="ID back"
                      className="h-24 rounded-xl border object-cover shadow-sm"
                    />
                  )}
                </div>
              )}
            </>
          ) : (
            volunteer && (
              <>
                <InfoRow
                  icon={User}
                  label="Full name"
                  value={getVolunteerName(volunteer) || "—"}
                />
                <InfoRow
                  icon={Phone}
                  label="Phone"
                  value={(volunteer as { phone?: string }).phone || "—"}
                />
                {(volunteer as { city?: string }).city && (
                  <InfoRow
                    icon={MapPin}
                    label="City"
                    value={(volunteer as { city?: string }).city!}
                  />
                )}
                <InfoRow
                  icon={Car}
                  label="Vehicle"
                  value={
                    (volunteer as { hasVehicle?: boolean }).hasVehicle
                      ? "Yes"
                      : "No"
                  }
                />
              </>
            )
          )}
        </div>
      </div>

      {/* Settings CTA */}
      <button
        onClick={() => nav("/settings")}
        className="flex w-full items-center justify-between rounded-2xl bg-white px-5 py-4 shadow-lg shadow-black/5 ring-1 ring-black/5 transition hover:shadow-xl active:scale-[0.99]"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-stone-100 text-stone-600">
            <Settings className="h-5 w-5" />
          </div>
          <div className="text-left">
            <p className="font-semibold text-foreground">Settings</p>
            <p className="text-sm text-muted-foreground">
              Account, data & preferences
            </p>
          </div>
        </div>
        <ChevronRight className="h-5 w-5 text-muted-foreground" />
      </button>
    </div>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 py-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-stone-100 text-stone-600">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <p className="truncate text-sm font-medium text-foreground">{value}</p>
      </div>
    </div>
  );
}
