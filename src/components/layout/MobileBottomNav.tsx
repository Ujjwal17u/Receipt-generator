import { Link, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, Settings, Receipt, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { title: "Home", url: "/", icon: LayoutDashboard },
  { title: "Receipts", url: "/create", icon: Receipt },
  { title: "Settings", url: "/settings", icon: Settings },
] as const;

export function MobileBottomNav() {
  const pathname = useRouterState({ select: (r) => r.location.pathname });

  return (
    <>
      <nav
        className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden"
        aria-label="Mobile navigation"
      >
        <div className="grid grid-cols-3">
          {items.map((item) => {
            const active = pathname === item.url;
            return (
              <Link
                key={item.title}
                to={item.url}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 py-2.5 text-xs font-medium transition-colors",
                  active ? "text-primary" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <item.icon className="h-5 w-5" />
                <span>{item.title}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Floating Create Button */}
      <Link
        to="/create"
        aria-label="Create receipt"
        className="gradient-primary shadow-elegant fixed bottom-20 right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full text-primary-foreground transition-transform hover:scale-105 active:scale-95 md:hidden"
      >
        <Plus className="h-6 w-6" />
      </Link>
    </>
  );
}
