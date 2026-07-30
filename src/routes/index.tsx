import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import {
  FilePlus2,
  Settings,
  Receipt,
  TrendingUp,
  FileText,
  HelpCircle,
  Sparkles,
  ArrowRight,
  Activity,
  Calendar,
  User,
  Trash2,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/common/PageHeader";
import { StatCard } from "@/components/common/StatCard";
import { EmptyState } from "@/components/common/EmptyState";
import { useBusinessSettings } from "@/lib/business-settings";
import { useReceipts } from "@/lib/receipt-store";
import { formatCurrency, formatDateTime } from "@/lib/receipt-utils";
import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard · ReceiptAI" },
      {
        name: "description",
        content:
          "Premium AI receipt generator dashboard — create receipts, manage business settings, and track activity.",
      },
      { property: "og:title", content: "Dashboard · ReceiptAI" },
      {
        property: "og:description",
        content: "Premium AI receipt generator dashboard.",
      },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { settings, isConfigured } = useBusinessSettings();
  const { receipts, totalToday, totalAllTime, deleteReceipt } = useReceipts();
  const router = useRouter();
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const greetingName = settings.companyName || "there";
  const totalReceipts = receipts.length;
  const todayCount = receipts.filter(
    (r) => new Date(r.dateIso).toDateString() === new Date().toDateString(),
  ).length;
  const recentReceipts = receipts.slice(0, 10);

  const handleDelete = async (id: string) => {
    await deleteReceipt(id);
    setDeleteId(null);
    toast.success("Receipt deleted", { description: "The receipt has been removed." });
  };

  return (
    <div className="space-y-8">
      {!isConfigured && (
        <div className="flex flex-col gap-3 rounded-2xl border border-primary/30 bg-primary/5 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="gradient-primary flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-primary-foreground">
              <Sparkles className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold">Finish your business setup</p>
              <p className="text-xs text-muted-foreground">
                Add your company name, logo, and contact details — they'll appear on every receipt.
              </p>
            </div>
          </div>
          <Button
            asChild
            size="sm"
            className="gradient-primary rounded-full text-primary-foreground shrink-0"
          >
            <Link to="/settings">Configure now</Link>
          </Button>
        </div>
      )}

      <PageHeader
        eyebrow="Overview"
        title={`Welcome back, ${greetingName}`}
        description="Create beautiful, professional receipts in seconds. Everything you need, in one clean workspace."
        actions={
          <>
            <Button asChild variant="outline" className="rounded-full">
              <Link to="/settings">
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </Link>
            </Button>
            <Button
              asChild
              className="gradient-primary rounded-full text-primary-foreground shadow-elegant"
            >
              <Link to="/create">
                <FilePlus2 className="mr-2 h-4 w-4" />
                Create Receipt
              </Link>
            </Button>
          </>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Receipts"
          value={totalReceipts}
          hint="All time"
          icon={Receipt}
          accent="primary"
        />
        <StatCard
          label="Today"
          value={todayCount}
          hint="Created today"
          icon={Activity}
          accent="success"
        />
        <StatCard
          label="Total Revenue"
          value={formatCurrency(totalAllTime, settings.currency)}
          hint={formatCurrency(totalToday, settings.currency) + " today"}
          icon={FileText}
          accent="warning"
        />
        <StatCard
          label="This Week"
          value={formatCurrency(
            receipts
              .filter((r) => Date.now() - new Date(r.dateIso).getTime() <= 7 * 24 * 60 * 60 * 1000)
              .reduce((s, r) => s + r.grandTotal, 0),
            settings.currency,
          )}
          hint="Last 7 days"
          icon={TrendingUp}
          accent="muted"
        />
      </div>

      {/* Highlight cards */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <HighlightCard
          to="/create"
          icon={FilePlus2}
          title="Create New Receipt"
          description="Generate a polished, printable receipt with itemized details and instant PDF export."
          cta="Start creating"
          featured
        />
        <HighlightCard
          to="/settings"
          icon={Settings}
          title="Business Settings"
          description="Add your logo, business name, address, tax details, and default currency."
          cta="Configure business"
        />
        <HighlightCard
          to="/create"
          icon={HelpCircle}
          title="Getting Started"
          description="Learn how to compose receipts, share them via QR, and export beautiful PDFs."
          cta="View guide"
        />
      </div>

      {/* Recent Receipts */}
      <section>
        <div className="mb-4 flex items-end justify-between">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Recent receipts</h2>
            <p className="text-sm text-muted-foreground">
              {totalReceipts > 0
                ? `Showing ${recentReceipts.length} of ${totalReceipts} receipts`
                : "Your latest receipts will appear here."}
            </p>
          </div>
          {totalReceipts > 0 && (
            <Button asChild variant="outline" size="sm" className="rounded-full">
              <Link to="/create">
                <FilePlus2 className="mr-2 h-3.5 w-3.5" />
                New receipt
              </Link>
            </Button>
          )}
        </div>
        <Card className="shadow-soft overflow-hidden">
          {recentReceipts.length === 0 ? (
            <CardContent className="p-6">
              <EmptyState
                icon={Receipt}
                title="No receipts created yet"
                description="Kick things off by creating your first receipt. It only takes a few seconds."
                action={
                  <Button asChild className="gradient-primary rounded-full text-primary-foreground">
                    <Link to="/create">
                      <Sparkles className="mr-2 h-4 w-4" />
                      Create your first receipt
                    </Link>
                  </Button>
                }
              />
            </CardContent>
          ) : (
            <div className="divide-y divide-border">
              {recentReceipts.map((r) => (
                <div
                  key={r.id}
                  role="button"
                  tabIndex={0}
                  onClick={(e) => {
                    if ((e.target as HTMLElement).closest('[role="alertdialog"], button')) return;
                    router.navigate({
                      to: "/receipts/$receiptId",
                      params: { receiptId: r.receiptNumber },
                    });
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      router.navigate({
                        to: "/receipts/$receiptId",
                        params: { receiptId: r.receiptNumber },
                      });
                    }
                  }}
                  className="group flex cursor-pointer items-center gap-4 p-4 sm:p-5 hover:bg-muted/30 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/40"
                >
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Receipt className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold tracking-tight">{r.receiptNumber}</p>
                      <p className="text-muted-foreground font-mono text-xs">
                        {r.items.length} {r.items.length === 1 ? "item" : "items"}
                      </p>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {r.customerName || "Walk-in customer"}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDateTime(new Date(r.dateIso))}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold tracking-tight">
                      {formatCurrency(r.grandTotal, settings.currency)}
                    </p>
                    {r.gstEnabled && (
                      <p className="text-xs text-muted-foreground">incl. GST @ {r.gstRate}%</p>
                    )}
                  </div>
                  <div className="hidden sm:flex items-center gap-1 ml-2">
                    <AlertDialog
                      open={deleteId === r.id}
                      onOpenChange={(o) => !o && setDeleteId(null)}
                    >
                      <AlertDialogTrigger asChild>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => setDeleteId(r.id)}
                          className="h-8 w-8 rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete receipt?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will permanently remove {r.receiptNumber}. This action cannot be
                            undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDelete(r.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </section>
    </div>
  );
}

function HighlightCard({
  to,
  icon: Icon,
  title,
  description,
  cta,
  featured,
}: {
  to: string;
  icon: typeof FilePlus2;
  title: string;
  description: string;
  cta: string;
  featured?: boolean;
}) {
  return (
    <Card
      className={
        "group relative overflow-hidden shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-elegant " +
        (featured ? "border-primary/30" : "")
      }
    >
      {featured && (
        <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-primary/15 blur-3xl" />
      )}
      <CardContent className="relative flex h-full flex-col gap-4 p-6">
        <div
          className={
            "flex h-11 w-11 items-center justify-center rounded-xl " +
            (featured
              ? "gradient-primary text-primary-foreground"
              : "bg-accent text-accent-foreground")
          }
        >
          <Icon className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <h3 className="text-base font-semibold tracking-tight">{title}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
        <Link
          to={to as "/create" | "/settings"}
          className="inline-flex items-center text-sm font-medium text-primary transition-colors hover:text-primary/80"
        >
          {cta}
          <ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </CardContent>
    </Card>
  );
}
