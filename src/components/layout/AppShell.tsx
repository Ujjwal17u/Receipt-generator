import type { ReactNode } from "react";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { TopNav } from "./TopNav";
import { MobileBottomNav } from "./MobileBottomNav";
import { Toaster } from "@/components/ui/sonner";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background text-foreground">
        <div className="hidden md:block">
          <AppSidebar />
        </div>
        <SidebarInset className="flex min-w-0 flex-1 flex-col">
          <TopNav />
          <main className="flex-1 px-4 pb-24 pt-6 md:px-8 md:pb-10">
            <div className="mx-auto w-full max-w-7xl animate-fade-in">{children}</div>
          </main>
        </SidebarInset>
        <MobileBottomNav />
        <Toaster />
      </div>
    </SidebarProvider>
  );
}
