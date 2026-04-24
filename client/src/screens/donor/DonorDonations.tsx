import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import type { Donation, DonationStatus } from "@/types";
import { api } from "@/lib/api";
import { useNavigate } from "react-router-dom";
import { Search } from "lucide-react";
import { GradientHeader } from "@/components/gradient-header/GradientHeader";
import { DonationCard } from "@/components/donation-cards/DonationCard";

const statuses: (DonationStatus | "All")[] = [
  "All",
  "PENDING",
  "ASSIGNED",
  "PICKED_UP",
  "DELIVERED",
  "CANCELLED",
];

export default function DonorDonations() {
  const nav = useNavigate();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<(typeof statuses)[number]>("All");
  const [list, setList] = useState<Donation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setList((await api.listDonations({ q, status })) as Donation[]);
      setLoading(false);
    })();
  }, [q, status]);

  return (
    <div className="space-y-4">
      <GradientHeader
        title="My Donations"
        subtitle="Track pickup status and delivery updates."
      />

      <div className="relative">
        <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="h-12 rounded-2xl border-0 bg-white pl-11 shadow-md shadow-black/5 focus-visible:ring-2 focus-visible:ring-primary/30"
          placeholder="Search location, category..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        {statuses.map((s) => (
          <button
            key={s}
            onClick={() => setStatus(s)}
            className={`shrink-0 rounded-full px-4 py-2.5 text-sm font-medium shadow-sm transition-all ${
              status === s
                ? "bg-primary text-white shadow-md shadow-primary/25"
                : "bg-white text-secondary-foreground hover:shadow-md"
            }`}
          >
            {s === "All" ? "All" : s.replace("_", " ")}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="py-8 text-center text-sm text-muted-foreground">Loading…</p>
      ) : list.length === 0 ? (
        <div className="rounded-2xl bg-white p-10 text-center shadow-lg shadow-black/5 ring-1 ring-black/5">
          <span className="mb-4 block text-6xl">🔍</span>
          <p className="text-base font-semibold text-foreground">No donations found</p>
          <p className="mt-2 text-sm text-muted-foreground">Try adjusting your search or filters.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {list.map((d) => (
            <DonationCard
              key={d.id}
              d={d}
              onClick={() => nav(`/donations/${d.id}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
