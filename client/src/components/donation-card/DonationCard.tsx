import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Donation } from "@/types";
import { StatusPill } from "../status-pill/StatusPill";

function timeLeftLabel(iso: string) {
  const ms = +new Date(iso) - Date.now();
  const mins = Math.max(0, Math.floor(ms / 60000));
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return mins === 0 ? "Due now" : h > 0 ? `${h}h ${m}m left` : `${m}m left`;
}

export function DonationCard({
  d,
  onClick,
}: {
  d: Donation;
  onClick?: () => void;
}) {
  return (
    <Card
      className={
        onClick
          ? "cursor-pointer transition hover:shadow-md hover:shadow-black/20"
          : ""
      }
      onClick={onClick}
    >
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-base">{d.category}</CardTitle>
          <StatusPill status={d.status} />
        </div>
        <div className="text-sm text-muted-foreground">
          {d.pickupLocation.label} • {timeLeftLabel(d.pickupBy)}
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex items-center justify-between">
          <div className="text-sm">
            <div className="font-medium">{d.servingsEstimate} servings</div>
            <div className="text-muted-foreground">
              {d.items.length} item types
            </div>
          </div>
          <div className="text-xs text-muted-foreground">{d.id}</div>
        </div>
      </CardContent>
    </Card>
  );
}
