import type { DonationStatus } from "@/types";
import { cn } from "@/lib/utils";

const map: Record<
  DonationStatus,
  { label: string; className: string }
> = {
  PENDING: { label: "Pending", className: "bg-amber-100 text-amber-800 ring-1 ring-amber-200/60" },
  ASSIGNED: { label: "Assigned", className: "bg-blue-100 text-blue-800 ring-1 ring-blue-200/60" },
  PICKED_UP: { label: "Picked up", className: "bg-indigo-100 text-indigo-800 ring-1 ring-indigo-200/60" },
  DELIVERED: { label: "Delivered", className: "bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200/60" },
  CANCELLED: { label: "Cancelled", className: "bg-red-100 text-red-800 ring-1 ring-red-200/60" },
};

export function StatusPill({ status }: { status: DonationStatus }) {
  const m = map[status];
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold shadow-sm",
        m.className
      )}
    >
      {m.label}
    </span>
  );
}
