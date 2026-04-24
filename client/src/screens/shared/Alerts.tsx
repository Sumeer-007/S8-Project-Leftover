import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GradientHeader } from "@/components/gradient-header/GradientHeader";

export default function Alerts() {
  const demo = [
    {
      id: "N1",
      type: "Donation",
      text: "Donation D-1002 assigned to volunteer Sam.",
      time: "Just now",
    },
    {
      id: "N2",
      type: "Task",
      text: "Task T-9001 is in progress.",
      time: "10m ago",
    },
    {
      id: "N3",
      type: "System",
      text: "Tip: Keep cooked food sealed and labelled.",
      time: "1h ago",
    },
  ];

  return (
    <div className="space-y-4">
      <GradientHeader
        title="Alerts"
        subtitle="Demo notifications (Phase 2: push notifications)."
      />
      <div className="space-y-3">
        {demo.map((n) => (
          <Card key={n.id} className="bg-card/60">
            <CardContent className="p-4 flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-medium">{n.text}</div>
                <div className="text-xs text-muted-foreground">{n.time}</div>
              </div>
              <Badge variant="secondary">{n.type}</Badge>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
