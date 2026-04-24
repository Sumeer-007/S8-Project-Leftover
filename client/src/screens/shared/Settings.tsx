import { useNavigate } from "react-router-dom";
import { GradientHeader } from "@/components/gradient-header/GradientHeader";
import { api } from "@/lib/api";
import {
  LogOut,
  Database,
  Trash2,
  ChevronRight,
  ShieldAlert,
} from "lucide-react";

export default function Settings() {
  const nav = useNavigate();

  return (
    <div className="space-y-6">
      <GradientHeader title="Settings" subtitle="Manage your account" />

      {/* Account section */}
      <div className="space-y-2">
        <p className="px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Account
        </p>
        <div className="overflow-hidden rounded-2xl bg-white shadow-lg shadow-black/5 ring-1 ring-black/5">
          <button
            onClick={async () => {
              await api.auth.logout();
              nav("/auth/login", { replace: true });
            }}
            className="flex w-full items-center gap-3 px-5 py-4 text-left transition hover:bg-stone-50 active:bg-stone-100"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <LogOut className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-foreground">Log out</p>
              <p className="text-sm text-muted-foreground">Sign out of your account</p>
            </div>
            <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* Data section */}
      <div className="space-y-2">
        <p className="px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Data
        </p>
        <div className="overflow-hidden rounded-2xl bg-white shadow-lg shadow-black/5 ring-1 ring-black/5">
          <button
            onClick={async () => {
              await api.resetDemo();
              nav("/", { replace: true });
            }}
            className="flex w-full items-center gap-3 border-b border-stone-100 px-5 py-4 text-left transition hover:bg-stone-50 active:bg-stone-100"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
              <Database className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-foreground">Reset donations & tasks</p>
              <p className="text-sm text-muted-foreground">Clear demo data, keep your account</p>
            </div>
            <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* Danger zone */}
      <div className="space-y-2">
        <p className="flex items-center gap-2 px-1 text-xs font-semibold uppercase tracking-wider text-red-600">
          <ShieldAlert className="h-3.5 w-3.5" />
          Danger zone
        </p>
        <div className="overflow-hidden rounded-2xl border-2 border-red-100 bg-white shadow-lg shadow-black/5">
          <button
            onClick={() => {
              api.resetDemo();
              api.auth.resetAuthDemo();
              nav("/auth/login", { replace: true });
            }}
            className="flex w-full items-center gap-3 px-5 py-4 text-left transition hover:bg-red-50 active:bg-red-100"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-600">
              <Trash2 className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-red-700">Reset everything</p>
              <p className="text-sm text-red-600/80">Clear all data including auth and sign you out</p>
            </div>
            <ChevronRight className="h-5 w-5 shrink-0 text-red-400" />
          </button>
        </div>
      </div>
    </div>
  );
}
