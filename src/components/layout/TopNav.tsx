import { Bell, Moon, Sun, Search } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useTheme } from "@/lib/theme";
import { useBusinessSettings } from "@/lib/business-settings";

export function TopNav() {
  const { theme, toggleTheme } = useTheme();
  const { settings } = useBusinessSettings();
  const today = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
  const initials =
    (settings.companyName || "ReceiptAI")
      .split(" ")
      .map((w) => w[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase() || "RA";

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur-md">
      <SidebarTrigger className="hidden md:inline-flex" />
      <div className="hidden md:block min-w-0">
        <span className="truncate text-sm font-medium">
          {settings.companyName || "ReceiptAI"}
        </span>
        <span className="mx-2 text-muted-foreground">·</span>
        <span className="text-sm text-muted-foreground">{today}</span>
      </div>
      <div className="md:hidden flex items-center gap-2 min-w-0">
        {settings.logoDataUrl ? (
          <img
            src={settings.logoDataUrl}
            alt=""
            className="h-8 w-8 shrink-0 rounded-lg border border-border object-contain bg-background"
          />
        ) : (
          <div className="gradient-primary h-8 w-8 shrink-0 rounded-lg" />
        )}
        <span className="truncate text-sm font-semibold">
          {settings.companyName || "ReceiptAI"}
        </span>
      </div>

      {/* Global search (UI ready) */}
      <div className="ml-auto hidden md:flex flex-1 max-w-sm items-center">
        <div className="group relative w-full">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary" />
          <input
            type="search"
            placeholder="Search receipts, customers…"
            className="h-9 w-full rounded-full border border-border bg-muted/50 pl-9 pr-3 text-sm outline-none transition-all placeholder:text-muted-foreground focus:border-primary/60 focus:bg-background focus:ring-2 focus:ring-primary/20"
          />
        </div>
      </div>

      <div className="ml-auto flex items-center gap-1.5 md:ml-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
          aria-label="Toggle theme"
          className="rounded-full"
        >
          {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>
        <Button variant="ghost" size="icon" aria-label="Notifications" className="rounded-full">
          <Bell className="h-4 w-4" />
        </Button>
        <Avatar className="h-8 w-8 border border-border">
          {settings.logoDataUrl && <AvatarImage src={settings.logoDataUrl} alt="" />}
          <AvatarFallback className="gradient-primary text-xs font-semibold text-primary-foreground">
            {initials}
          </AvatarFallback>
        </Avatar>
      </div>
    </header>
  );
}
