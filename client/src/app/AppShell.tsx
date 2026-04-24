// src/app/AppShell.tsx
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  Home,
  PlusCircle,
  HandHeart,
  ClipboardList,
  Bell,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getCurrentUserSync } from "@/lib/authClient";

type NavItem = { label: string; icon: React.ElementType; to: string };

function getRoleNav(): NavItem[] {
  const user = getCurrentUserSync();

  // fallback nav if something goes wrong
  if (!user) {
    return [
      { label: "Home", icon: Home, to: "/auth" },
      { label: "Alerts", icon: Bell, to: "/alerts" },
      { label: "Profile", icon: User, to: "/profile" },
      { label: "Home", icon: Home, to: "/auth" },
      { label: "Home", icon: Home, to: "/auth" },
    ];
  }

  if (user.role === "DONOR") {
    return [
      { label: "Home", icon: Home, to: "/donor/home" },
      { label: "Create", icon: PlusCircle, to: "/donor/create" },
      { label: "Donations", icon: ClipboardList, to: "/donor/donations" },
      { label: "Alerts", icon: Bell, to: "/alerts" },
      { label: "Profile", icon: User, to: "/profile" },
    ];
  }

  return [
    { label: "Home", icon: Home, to: "/volunteer/home" },
    { label: "Pickups", icon: HandHeart, to: "/volunteer/pickups" },
    { label: "Tasks", icon: ClipboardList, to: "/volunteer/tasks" },
    { label: "Alerts", icon: Bell, to: "/alerts" },
    { label: "Profile", icon: User, to: "/profile" },
  ];
}

export default function AppShell() {
  const nav = getRoleNav();
  const loc = useLocation();
  const navigate = useNavigate();

  return (
    <div className="min-h-dvh">
      <div className="mx-auto max-w-md px-4 pb-28 pt-4">
        <Outlet />
      </div>

      {/* Polished bottom nav: white bar, active pill, subtle shadow */}
      <nav className="fixed inset-x-0 bottom-0 z-50 mx-auto w-full max-w-md rounded-t-3xl border-t border-stone-200/80 bg-white/95 shadow-[0_-8px_32px_rgba(0,0,0,0.08)] backdrop-blur-md">
        <div className="grid grid-cols-5 items-center gap-1 px-2 py-2.5">
          {nav.map((item) => {
            const active = loc.pathname.startsWith(item.to);
            const Icon = item.icon;
            return (
              <button
                key={item.to}
                onClick={() => navigate(item.to)}
                className={cn(
                  "relative flex min-w-0 flex-col items-center gap-1 rounded-2xl px-1 py-2 transition-all duration-200",
                  active
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <div
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-xl transition-all duration-200",
                    active && "bg-primary/10",
                  )}
                >
                  <Icon
                    className={cn(
                      "h-[18px] w-[18px]",
                      active && "stroke-[2.5]",
                    )}
                  />
                </div>
                <span className="w-full truncate text-center text-[11px] font-medium leading-4">
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
