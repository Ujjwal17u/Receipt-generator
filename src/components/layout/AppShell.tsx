import type { ReactNode } from "react";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { TopNav } from "./TopNav";
import { MobileBottomNav } from "./MobileBottomNav";
import { Toaster } from "@/components/ui/sonner";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background text-foreground print:min-h-0 print:block">
        <div className="hidden md:block print:hidden">
          <AppSidebar />
        </div>
        <SidebarInset className="flex min-w-0 flex-1 flex-col print:block print:min-w-full print:flex-none">
          <div className="print:hidden">
            <TopNav />
          </div>
          <main className="flex-1 px-4 pb-24 pt-6 md:px-8 md:pb-10 print:px-0 print:pb-0 print:pt-0">
            <div className="mx-auto w-full max-w-7xl animate-fade-in print:mx-0 print:max-w-none print:w-full print:animate-none">
              {children}
            </div>
          </main>
        </SidebarInset>
        <div className="print:hidden">
          <MobileBottomNav />
        </div>
        <Toaster />
      </div>
    </SidebarProvider>
  );
}
