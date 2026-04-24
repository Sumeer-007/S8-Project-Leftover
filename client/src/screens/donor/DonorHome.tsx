import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import type { Donation } from "@/types";
import { useNavigate } from "react-router-dom";
import { Plus, Search } from "lucide-react";
import { GradientHeader } from "@/components/gradient-header/GradientHeader";
import { DonationCard } from "@/components/donation-cards/DonationCard";

const CATEGORIES = ["All", "Cooked Meals", "Groceries", "Bakery", "Fruits", "Mixed"] as const;

export default function DonorHome() {
  const nav = useNavigate();
  const [donations, setDonations] = useState<Donation[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("All");

  useEffect(() => {
    (async () => {
      setLoading(true);
      const data = (await api.listDonations()) as Donation[];
      setDonations(data);
      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(() => {
    let list = donations;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (d) =>
          d.category.toLowerCase().includes(q) ||
          d.pickupLocation.label.toLowerCase().includes(q) ||
          d.items.some((i) => i.name.toLowerCase().includes(q))
      );
    }
    if (category !== "All") {
      list = list.filter((d) => d.category === category);
    }
    return list;
  }, [donations, search, category]);

  const stats = useMemo(() => {
    const active = donations.filter((d) =>
      ["PENDING", "ASSIGNED", "PICKED_UP"].includes(d.status)
    ).length;
    const delivered = donations.filter((d) => d.status === "DELIVERED").length;
    return { active, delivered };
  }, [donations]);

  return (
    <div className="space-y-4">
      <GradientHeader
        title="Donate food"
        subtitle="Post a donation in under a minute — volunteers will pick it up."
        right={
          <button
            onClick={() => nav("/donor/create")}
            className="flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 font-semibold text-primary shadow-lg shadow-black/10 transition hover:bg-white/95 active:scale-[0.98]"
          >
            <Plus className="h-4 w-4" strokeWidth={2.5} />
            Create
          </button>
        }
      />

      {/* Search bar - elevated, friendly */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="h-12 rounded-2xl border-0 bg-white pl-11 shadow-md shadow-black/5 placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-primary/30"
          placeholder="Search donations..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Category chips - horizontal scroll with emoji */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {CATEGORIES.map((c) => {
          const emoji = c === "All" ? "✨" : c === "Cooked Meals" ? "🍛" : c === "Groceries" ? "🛒" : c === "Bakery" ? "🥐" : c === "Fruits" ? "🍎" : "🥗";
          const isActive = category === c;
          return (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={`flex shrink-0 items-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium transition-all ${
                isActive
                  ? "bg-primary text-white shadow-md shadow-primary/25"
                  : "bg-white text-secondary-foreground shadow-sm hover:shadow-md hover:bg-white"
              }`}
            >
              <span className="text-base">{emoji}</span>
              <span>{c}</span>
            </button>
          );
        })}
      </div>

      {/* Stats - cards with icons & personality */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-white p-4 shadow-lg shadow-black/5 ring-1 ring-black/5">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <span className="text-lg">📦</span>
            </div>
            <p className="text-sm font-medium text-muted-foreground">Active</p>
          </div>
          <p className="mt-3 text-2xl font-extrabold tracking-tight text-foreground">{stats.active}</p>
        </div>
        <div className="rounded-2xl bg-white p-4 shadow-lg shadow-black/5 ring-1 ring-black/5">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
              <span className="text-lg">✓</span>
            </div>
            <p className="text-sm font-medium text-muted-foreground">Delivered</p>
          </div>
          <p className="mt-3 text-2xl font-extrabold tracking-tight text-foreground">{stats.delivered}</p>
        </div>
      </div>

      {/* Donation cards */}
      <div>
        <h2 className="mb-4 text-lg font-bold tracking-tight text-foreground">Recent donations</h2>
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-48 animate-pulse rounded-2xl bg-white shadow-sm ring-1 ring-black/5" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl bg-white p-10 text-center shadow-lg shadow-black/5 ring-1 ring-black/5">
            <span className="mb-4 block text-6xl">📦</span>
            <p className="text-base font-semibold text-foreground">No donations yet</p>
            <p className="mt-2 text-sm text-muted-foreground">Create your first donation to get started.</p>
            <Button
              className="mt-6 rounded-xl font-semibold shadow-md shadow-primary/20"
              onClick={() => nav("/donor/create")}
            >
              <Plus className="mr-2 h-4 w-4" />
              Create donation
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {filtered.slice(0, 4).map((d) => (
              <DonationCard
                key={d.id}
                d={d}
                onClick={() => nav(`/donations/${d.id}`)}
              />
            ))}
          </div>
        )}
        {!loading && filtered.length > 0 && (
          <Button
            variant="outline"
            className="mt-5 w-full rounded-xl border-2 font-medium shadow-sm"
            onClick={() => nav("/donor/donations")}
          >
            View all donations
          </Button>
        )}
      </div>
    </div>
  );
}
