import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import type { Donation } from "@/types";
import { api } from "@/lib/api";
import { MapPin, Phone, ChevronLeft } from "lucide-react";
import { GradientHeader } from "@/components/gradient-header/GradientHeader";
import { StatusPill } from "@/components/status-pill/StatusPill";
import { getCurrentUserSync, getHomePathFor } from "@/lib/authClient";

export default function DonationDetails() {
  const { id } = useParams();
  const nav = useNavigate();
  const [d, setD] = useState<Donation | null>(null);

  useEffect(() => {
    (async () => {
      if (!id) return;
      setD((await api.getDonation(id)) as Donation | null);
    })();
  }, [id]);

  const totalItems = useMemo(
    () => (d ? d.items.reduce((s, it) => s + it.quantity, 0) : 0),
    [d],
  );

  if (!d) return <div className="text-sm text-muted-foreground">Loading…</div>;

  return (
    <div className="space-y-4">
      <GradientHeader
        title={`Donation ${d.id}`}
        subtitle={`${d.category} • ${d.servingsEstimate} servings`}
        right={
          <button
            onClick={() => {
              const user = getCurrentUserSync();
              if (user) {
                nav(getHomePathFor(user));
              } else {
                nav("/");
              }
            }}
            className="flex items-center gap-2 rounded-xl bg-white px-3 py-2 font-semibold text-primary shadow-lg shadow-black/10 transition hover:bg-white/95 active:scale-[0.98]"
          >
            <ChevronLeft className="h-4 w-4" strokeWidth={2.5} />
            Back
          </button>
        }
      />

      <Card className="rounded-2xl border-0 bg-white shadow-lg shadow-black/5 ring-1 ring-black/5">
        <CardContent className="space-y-3 p-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">Status</div>
            <StatusPill status={d.status} />
          </div>

          <Separator />

          <div className="space-y-2">
            <div className="text-sm font-medium">Pickup</div>
            <div className="flex items-start gap-2 text-sm">
              <MapPin className="mt-0.5 h-4 w-4 text-muted-foreground" />
              <div>
                <div className="font-medium">{d.pickupLocation.label}</div>
                <div className="text-muted-foreground">
                  {d.pickupLocation.address}
                </div>
                <div className="text-muted-foreground">
                  Pickup by: {new Date(d.pickupBy).toLocaleString()}
                </div>
              </div>
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <div className="text-sm font-medium">
              Items ({totalItems} total)
            </div>
            <div className="space-y-1">
              {d.items.map((it, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between text-sm"
                >
                  <span>{it.name}</span>
                  <span className="text-muted-foreground">
                    {it.quantity} {it.unit}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {d.notes ? (
            <>
              <Separator />
              <div className="space-y-1">
                <div className="text-sm font-medium">Notes</div>
                <div className="text-sm text-muted-foreground">{d.notes}</div>
              </div>
            </>
          ) : null}

          {d.assignedVolunteer ? (
            <>
              <Separator />
              <div className="space-y-1">
                <div className="text-sm font-medium">Assigned volunteer</div>
                <div className="flex items-center justify-between rounded-xl border bg-background/30 p-3">
                  <div>
                    <div className="text-sm font-medium">
                      {d.assignedVolunteer.name}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {d.assignedVolunteer.phoneMasked}
                    </div>
                  </div>
                  <Button variant="secondary" className="rounded-xl">
                    <Phone className="mr-2 h-4 w-4" />
                    Contact
                  </Button>
                </div>
              </div>
            </>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
