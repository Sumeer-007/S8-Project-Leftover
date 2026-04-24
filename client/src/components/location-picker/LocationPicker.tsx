import { useMemo, useState } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import L from "leaflet";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
// import { useToast } from "@/components/ui/use-toast";

type PickedLocation = {
  label: string;
  address: string;
  lat: number;
  lng: number;
};

const markerIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

function ClickToPick({
  onPick,
}: {
  onPick: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

async function geocode(query: string) {
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
    query
  )}`;
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error("Geocoding failed");
  const data = (await res.json()) as any[];
  return data;
}

async function reverseGeocode(lat: number, lng: number) {
  const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`;
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error("Reverse geocoding failed");
  return (await res.json()) as any;
}

export function LocationPicker({
  value,
  onChange,
}: {
  value: PickedLocation;
  onChange: (v: PickedLocation) => void;
}) {
  //   const { toast } = useToast();
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);

  const center = useMemo<[number, number]>(
    () => [value.lat, value.lng],
    [value.lat, value.lng]
  );

  async function pick(lat: number, lng: number) {
    setBusy(true);
    try {
      const rev = await reverseGeocode(lat, lng);
      const address =
        rev?.display_name ?? `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
      onChange({
        ...value,
        lat,
        lng,
        address,
        label: value.label || "Picked location",
      });
    } catch (e: any) {
      //   toast({
      //     title: "Could not fetch address",
      //     description: e?.message ?? "Try again",
      //     variant: "destructive",
      //   });
      onChange({
        ...value,
        lat,
        lng,
        address: `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <Card className="p-3 bg-card/60 rounded-2xl">
        <div className="flex gap-2">
          <Input
            className="rounded-xl"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search place / address (e.g., Norwich Market)"
          />
          <Button
            className="rounded-xl"
            variant="secondary"
            disabled={busy || q.trim().length < 3}
            onClick={async () => {
              setBusy(true);
              try {
                const results = await geocode(q);
                if (!results?.length) {
                  //   toast({ title: "No results", description: "Try a different search." });
                  return;
                }
                const r = results[0];
                await pick(Number(r.lat), Number(r.lon));
              } catch (e: any) {
                // toast({ title: "Search failed", description: e?.message ?? "Try again", variant: "destructive" });
              } finally {
                setBusy(false);
              }
            }}
          >
            Search
          </Button>
        </div>

        <div className="mt-2 text-xs text-muted-foreground">
          Tip: You can also click the map to drop the pin.
        </div>
      </Card>

      <div className="overflow-hidden rounded-2xl border bg-card/40">
        <MapContainer
          center={center}
          zoom={13}
          style={{ height: 280, width: "100%" }}
        >
          <TileLayer
            attribution="&copy; OpenStreetMap contributors"
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <ClickToPick onPick={pick} />
          <Marker position={center} icon={markerIcon} />
        </MapContainer>
      </div>
    </div>
  );
}
