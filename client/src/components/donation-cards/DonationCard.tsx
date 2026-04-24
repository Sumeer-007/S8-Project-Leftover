import type { Donation } from "@/types";
import { StatusPill } from "../status-pill/StatusPill";
import { MapPin, Clock, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

function timeLeftLabel(iso: string) {
  const ms = +new Date(iso) - Date.now();
  const mins = Math.max(0, Math.floor(ms / 60000));
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return mins === 0 ? "Due now" : h > 0 ? `${h}h ${m}m left` : `${m}m left`;
}

/** Category → emoji + gradient accent */
const CATEGORY_META: Record<string, { emoji: string; gradient: string }> = {
  "Cooked Meals": { emoji: "🍛", gradient: "from-amber-400/30 via-orange-300/20 to-transparent" },
  Groceries: { emoji: "🛒", gradient: "from-green-400/30 via-emerald-300/20 to-transparent" },
  Bakery: { emoji: "🥐", gradient: "from-yellow-400/30 via-amber-300/20 to-transparent" },
  Fruits: { emoji: "🍎", gradient: "from-rose-400/30 via-pink-300/20 to-transparent" },
  Mixed: { emoji: "🥗", gradient: "from-teal-400/30 via-cyan-300/20 to-transparent" },
};

export function DonationCard({
  d,
  onClick,
}: {
  d: Donation;
  onClick?: () => void;
}) {
  const meta = CATEGORY_META[d.category] ?? { emoji: "📦", gradient: "from-gray-400/30 to-transparent" };

  return (
    <article
      className={cn(
        "group overflow-hidden rounded-2xl bg-white shadow-lg shadow-black/5 ring-1 ring-black/5 transition-all duration-200",
        onClick && "cursor-pointer hover:-translate-y-0.5 hover:shadow-xl hover:shadow-black/10 active:scale-[0.99]"
      )}
      onClick={onClick}
    >
      {/* Hero area with category-specific gradient */}
      <div
        className={cn(
          "relative flex h-32 items-center justify-center bg-gradient-to-br",
          meta.gradient
        )}
      >
        <span className="text-6xl drop-shadow-sm">{meta.emoji}</span>
        <div className="absolute right-3 top-3">
          <StatusPill status={d.status} />
        </div>
        {onClick && (
          <div className="absolute right-3 bottom-3 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 shadow-sm transition group-hover:bg-white">
            <ChevronRight className="h-4 w-4 text-muted-foreground" strokeWidth={2.5} />
          </div>
        )}
      </div>

      <div className="p-4">
        <h3 className="text-base font-bold tracking-tight text-foreground">{d.category}</h3>
        <div className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground">
          <MapPin className="h-4 w-4 shrink-0" />
          <span className="truncate">{d.pickupLocation.label}</span>
        </div>
        <div className="mt-3 flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            {timeLeftLabel(d.pickupBy)}
          </span>
          <span className="rounded-full bg-primary/10 px-3 py-1 text-sm font-semibold text-primary">
            {d.servingsEstimate} servings
          </span>
        </div>
      </div>
    </article>
  );
}
