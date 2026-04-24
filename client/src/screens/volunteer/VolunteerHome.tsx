import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Donation } from "@/types";
import { api } from "@/lib/api";
import { useNavigate } from "react-router-dom";
import { HandHeart, Search } from "lucide-react";
import { GradientHeader } from "@/components/gradient-header/GradientHeader";
import { DonationCard } from "@/components/donation-cards/DonationCard";

export default function VolunteerHome() {
  const nav = useNavigate();
  const [list, setList] = useState<Donation[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    (async () => {
      setLoading(true);
      const data = (await api.listDonations({ status: "PENDING", q: search })) as Donation[];
      setList(data);
      setLoading(false);
    })();
  }, [search]);

  return (
    <div className="space-y-4">
      <GradientHeader
        title="Pick up donations"
        subtitle="Find nearby donations and help reduce food waste."
        right={
          <button
            onClick={() => nav("/volunteer/pickups")}
            className="flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 font-semibold text-primary shadow-lg shadow-black/10 transition hover:bg-white/95 active:scale-[0.98]"
          >
            <HandHeart className="h-4 w-4" strokeWidth={2.5} />
            Find pickups
          </button>
        }
      />

      {/* Search bar */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="h-12 rounded-2xl border-0 bg-white pl-11 shadow-md shadow-black/5 placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-primary/30"
          placeholder="Search area or category..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Available donations */}
      <div>
        <h2 className="mb-4 text-lg font-bold tracking-tight text-foreground">Available now</h2>
        {loading ? (
          <div className="space-y-4">
            {[1, 2].map((i) => (
              <div key={i} className="h-48 animate-pulse rounded-2xl bg-white shadow-sm ring-1 ring-black/5" />
            ))}
          </div>
        ) : list.length === 0 ? (
          <div className="rounded-2xl bg-white p-10 text-center shadow-lg shadow-black/5 ring-1 ring-black/5">
            <span className="mb-4 block text-6xl">🤝</span>
            <p className="text-base font-semibold text-foreground">Nothing available yet</p>
            <p className="mt-2 text-sm text-muted-foreground">Check back soon or browse all pickups.</p>
            <Button
              className="mt-6 rounded-xl font-semibold shadow-md shadow-primary/20"
              onClick={() => nav("/volunteer/pickups")}
            >
              <HandHeart className="mr-2 h-4 w-4" />
              Browse all pickups
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {list.slice(0, 4).map((d) => (
              <DonationCard
                key={d.id}
                d={d}
                onClick={() => nav(`/donations/${d.id}`)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
