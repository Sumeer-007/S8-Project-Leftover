// src/screens/donor/DonorCreate.tsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { DonationItem, FoodCategory } from "@/types";
import { api } from "@/lib/api";
import { GradientHeader } from "@/components/gradient-header/GradientHeader";
import { LocationPicker } from "@/components/location-picker/LocationPicker";
import { getCurrentUserSync } from "@/lib/authClient";
import { maskPhone } from "@/lib/utils";

const categories: FoodCategory[] = [
  "Cooked Meals",
  "Groceries",
  "Bakery",
  "Fruits",
  "Mixed",
];

async function reverseGeocode(lat: number, lng: number) {
  const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`;
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error("Reverse geocoding failed");
  return (await res.json()) as any;
}

function getLabelFromReverseGeocode(result: any, fallback: string) {
  if (!result) return fallback;
  if (typeof result.name === "string" && result.name.trim().length > 0) {
    return result.name;
  }
  if (typeof result.display_name === "string" && result.display_name.trim().length > 0) {
    return result.display_name.split(",")[0];
  }
  return fallback;
}

type Step = 1 | 2;

export default function DonorCreate() {
  const nav = useNavigate();
  const [step, setStep] = useState<Step>(1);

  // ---------- Step 1: Food info ----------
  const [category, setCategory] = useState<FoodCategory>("Cooked Meals");
  const [servings, setServings] = useState(20);
  const [notes, setNotes] = useState(
    "Packed & sealed. Please bring insulated bag.",
  );
  const [items, setItems] = useState<DonationItem[]>([]);

  function updateItem(i: number, patch: Partial<DonationItem>) {
    setItems((prev) =>
      prev.map((it, idx) => (idx === i ? { ...it, ...patch } : it)),
    );
  }
  function removeItem(i: number) {
    setItems((prev) => prev.filter((_, idx) => idx !== i));
  }

  // ---------- Step 2: Pickup details ----------
  const [pickupLocation, setPickupLocation] = useState({
    label: "Current location",
    address: "Detecting your current location…",
    lat: 52.6287,
    lng: 1.2923,
  });

  const [pickupBy, setPickupBy] = useState(() => {
    const d = new Date(Date.now() + 2 * 60 * 60 * 1000);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(
      d.getDate(),
    )}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  });

  // GPS default
  useEffect(() => {
    let cancelled = false;

    async function detect() {
      if (!("geolocation" in navigator)) {
        setPickupLocation((p) => ({
          ...p,
          address: "Geolocation not supported on this device.",
        }));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          if (cancelled) return;
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;

          setPickupLocation((p) => ({
            ...p,
            lat,
            lng,
            label: "Current location",
            address: "Finding address…",
          }));

          try {
            const rev = await reverseGeocode(lat, lng);
            if (cancelled) return;
            const address =
              rev?.display_name ?? `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
            const label = getLabelFromReverseGeocode(rev, "Current location");
            setPickupLocation((p) => ({ ...p, address, label }));
          } catch {
            if (cancelled) return;
            setPickupLocation((p) => ({
              ...p,
              address: `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
            }));
          }
        },
        () => {
          if (cancelled) return;
          setPickupLocation((p) => ({
            ...p,
            address:
              "Location permission denied — please pick a location on the map.",
          }));
        },
        { enableHighAccuracy: true, timeout: 8000 },
      );
    }

    detect();
    return () => {
      cancelled = true;
    };
  }, []);

  // ---------- Validation ----------
  const foodValid = useMemo(() => {
    const validItems = items.some(
      (x) => x.name.trim().length > 0 && x.quantity > 0,
    );
    return validItems && servings > 0;
  }, [items, servings]);

  const pickupValid = useMemo(() => {
    const hasLocation =
      Number.isFinite(pickupLocation.lat) &&
      Number.isFinite(pickupLocation.lng);
    const hasAddress = pickupLocation.address.trim().length > 6;
    const hasDeadline = pickupBy.trim().length > 5;
    return hasLocation && hasAddress && hasDeadline;
  }, [pickupLocation, pickupBy]);

  const canSubmit = foodValid && pickupValid;

  // ---------- Actions ----------
  function next() {
    if (step === 1) setStep(2);
  }
  function back() {
    if (step === 2) setStep(1);
  }

  return (
    <div className="space-y-4">
      <GradientHeader
        title="Create Donation"
        subtitle={
          step === 1
            ? "Step 1 of 2 • Food details"
            : "Step 2 of 2 • Pickup location"
        }
      />

      {/* Step indicator */}
      <div className="grid grid-cols-2 gap-2">
        <div
          className={`rounded-2xl border p-3 ${
            step === 1 ? "bg-card/70" : "bg-card/40"
          }`}
        >
          <div className="text-xs text-muted-foreground">Step 1</div>
          <div className="text-sm font-medium">Food</div>
        </div>
        <div
          className={`rounded-2xl border p-3 ${
            step === 2 ? "bg-card/70" : "bg-card/40"
          }`}
        >
          <div className="text-xs text-muted-foreground">Step 2</div>
          <div className="text-sm font-medium">Pickup</div>
        </div>
      </div>

      {/* STEP 1 */}
      {step === 1 ? (
        <Card className="bg-card/60">
          <CardContent className="space-y-4 p-4">
            <div className="text-sm font-medium">Food info</div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <div className="text-xs text-muted-foreground">Category</div>
                <Select
                  value={category}
                  onValueChange={(v) => setCategory(v as FoodCategory)}
                >
                  <SelectTrigger className="rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <div className="text-xs text-muted-foreground">Servings</div>
                <Input
                  className="rounded-xl"
                  type="number"
                  value={servings}
                  min={1}
                  onChange={(e) => setServings(Number(e.target.value))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-xs text-muted-foreground">Items</div>
              <div className="space-y-2">
                {items.map((it, i) => (
                  <div key={i} className="grid grid-cols-12 gap-2">
                    <Input
                      className="col-span-6 rounded-xl"
                      value={it.name}
                      onChange={(e) => updateItem(i, { name: e.target.value })}
                      placeholder="Item name"
                    />
                    <Input
                      className="col-span-2 rounded-xl"
                      type="number"
                      value={it.quantity}
                      min={1}
                      onChange={(e) =>
                        updateItem(i, { quantity: Number(e.target.value) })
                      }
                    />
                    <Select
                      value={it.unit}
                      onValueChange={(v) =>
                        updateItem(i, { unit: v as DonationItem["unit"] })
                      }
                    >
                      <SelectTrigger className="col-span-3 rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {["plates", "packs", "kg", "boxes"].map((u) => (
                          <SelectItem key={u} value={u}>
                            {u}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Button
                      variant="secondary"
                      className="col-span-1 rounded-xl px-0"
                      title="Remove"
                      onClick={() => removeItem(i)}
                      disabled={items.length <= 1}
                    >
                      ×
                    </Button>
                  </div>
                ))}

                <Button
                  variant="secondary"
                  className="w-full rounded-xl"
                  onClick={() =>
                    setItems((p) => [
                      ...p,
                      { name: "", quantity: 1, unit: "packs" },
                    ])
                  }
                >
                  + Add item
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-xs text-muted-foreground">
                Notes (optional)
              </div>
              <Textarea
                className="rounded-xl"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            <div className="flex gap-2">
              <Button
                variant="secondary"
                className="rounded-xl w-1/3"
                onClick={() => nav(-1)}
              >
                Cancel
              </Button>
              <Button
                className="rounded-xl flex-1"
                disabled={!foodValid}
                onClick={next}
              >
                Next
              </Button>
            </div>

            {!foodValid ? (
              <div className="text-xs text-muted-foreground">
                Add at least 1 item and servings.
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {/* STEP 2 */}
      {step === 2 ? (
        <Card className="bg-card/60">
          <CardContent className="space-y-4 p-4">
            <div className="text-sm font-medium">Pickup details</div>

            <div className="space-y-2">
              <div className="text-xs text-muted-foreground">Pickup by</div>
              <Input
                className="rounded-xl"
                type="datetime-local"
                value={pickupBy}
                onChange={(e) => setPickupBy(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <div className="text-xs text-muted-foreground">
                Pickup location (search or click map)
              </div>
              <LocationPicker
                value={pickupLocation}
                onChange={setPickupLocation}
              />
            </div>

            {/* Manual edits */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <div className="text-xs text-muted-foreground">
                  Location label
                </div>
                <Input
                  className="rounded-xl"
                  value={pickupLocation.label}
                  onChange={(e) =>
                    setPickupLocation((p) => ({ ...p, label: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <div className="text-xs text-muted-foreground">Address</div>
                <Input
                  className="rounded-xl"
                  value={pickupLocation.address}
                  onChange={(e) =>
                    setPickupLocation((p) => ({
                      ...p,
                      address: e.target.value,
                    }))
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <div className="text-xs text-muted-foreground">Latitude</div>
                <Input
                  className="rounded-xl"
                  value={String(pickupLocation.lat)}
                  inputMode="decimal"
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    setPickupLocation((p) => ({
                      ...p,
                      lat: Number.isFinite(v) ? v : p.lat,
                    }));
                  }}
                />
              </div>
              <div className="space-y-2">
                <div className="text-xs text-muted-foreground">Longitude</div>
                <Input
                  className="rounded-xl"
                  value={String(pickupLocation.lng)}
                  inputMode="decimal"
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    setPickupLocation((p) => ({
                      ...p,
                      lng: Number.isFinite(v) ? v : p.lng,
                    }));
                  }}
                />
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                variant="secondary"
                className="rounded-xl w-1/3"
                onClick={back}
              >
                Back
              </Button>

              <Button
                className="rounded-xl flex-1"
                disabled={!canSubmit}
                onClick={async () => {
                  const user = getCurrentUserSync();
                  if (!user || user.role !== "DONOR") {
                    nav("/auth/login");
                    return;
                  }
                  const donor = user.donor as
                    | { fullName?: string; full_name?: string; phone?: string }
                    | undefined;
                  const donorName =
                    donor?.fullName ??
                    donor?.full_name ??
                    user.username ??
                    "Donor";
                  const donorPhone = donor?.phone ?? "";
                  const d = await api.createDonation({
                    donorName,
                    donorPhoneMasked: maskPhone(donorPhone),
                    pickupBy: new Date(pickupBy).toISOString(),
                    category,
                    servingsEstimate: servings,
                    items: items.filter((x) => x.name.trim().length > 0),
                    pickupLocation,
                    notes,
                    dietaryTags: [],
                  });
                  nav(`/donations/${(d as { id: string }).id}`);
                }}
              >
                Post donation
              </Button>
            </div>

            {!pickupValid ? (
              <div className="text-xs text-muted-foreground">
                Choose a valid pickup deadline + location.
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
