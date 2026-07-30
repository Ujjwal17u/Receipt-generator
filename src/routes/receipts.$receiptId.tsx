import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import {
  ArrowLeft,
  ChevronRight,
  Download,
  Edit2,
  FilePlus2,
  Printer,
  Receipt,
  Share2,
  Trash2,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/common/PageHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { StatCard } from "@/components/common/StatCard";
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
import { ReceiptPreview, hydrateReceiptForPreview } from "@/components/receipt/ReceiptPreview";
import { useBusinessSettings } from "@/lib/business-settings";
import { useReceipts, type Receipt as ReceiptT } from "@/lib/receipt-store";
import { formatCurrency, formatDateTime, numberToWords } from "@/lib/receipt-utils";

type ExportMode = "download" | "print";

const WAIT_EXPORT_MS = 250;

export const Route = createFileRoute("/receipts/$receiptId")({
  head: () => ({
    meta: [
      { title: "Receipt Details · ReceiptAI" },
      {
        name: "description",
        content: "View, print, and share a saved receipt.",
      },
      { property: "og:title", content: "Receipt Details · ReceiptAI" },
      {
        property: "og:description",
        content: "View, print, and share a saved receipt.",
      },
    ],
  }),
  component: ReceiptDetail,
});

function ReceiptDetail() {
  const { receiptId } = Route.useParams();
  const router = useRouter();
  const { settings } = useBusinessSettings();
  const { receipts, getReceipt, deleteReceipt } = useReceipts();

  const receipt: ReceiptT | undefined = useMemo(
    () => getReceipt(receiptId),
    [receiptId, getReceipt, receipts],
  );

  const exportKeyRef = useRef(0);
  const exportingRef = useRef(false);
  const [exportPreviewData, setExportPreviewData] = useState<null | ReturnType<
    typeof hydrateReceiptForPreview
  >>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const preview = useMemo(() => {
    if (!receipt) return null;
    return hydrateReceiptForPreview(receipt, settings);
  }, [receipt, settings]);

  const handleDelete = async () => {
    if (!receipt) return;
    await deleteReceipt(receipt.id);
    toast.success("Receipt deleted", {
      description: `${receipt.receiptNumber} has been removed.`,
    });
    router.navigate({ to: "/" });
  };

  const handleShare = async () => {
    if (!receipt) return;
    const text = `${receipt.receiptNumber} — ${formatCurrency(receipt.grandTotal, settings.currency)}\nCustomer: ${receipt.customerName || "Walk-in customer"}\n${receipt.items.length} items — paid ${formatCurrency(receipt.grandTotal, settings.currency)}`;
    const shareUrl = typeof window !== "undefined" ? window.location.href : "";
    try {
      if (typeof navigator !== "undefined" && "share" in navigator) {
        await (navigator as any).share({
          title: receipt.receiptNumber,
          text,
          url: shareUrl,
        });
      } else {
        await navigator.clipboard.writeText(`${text}\n${shareUrl}`);
        toast.success("Copied to clipboard", {
          description: "Share details copied. Paste it anywhere.",
        });
      }
    } catch {
      /* ignore */
    }
  };

  const collectStylesheets = (doc: Document): string => {
    let css = "";
    for (const sheet of Array.from(doc.styleSheets)) {
      try {
        const rules = (sheet as any).cssRules;
        if (rules) {
          for (const rule of Array.from(rules)) css += rule.cssText + "\n";
        }
      } catch {
        const link = (sheet as any).ownerNode;
        if (link?.href) {
          css += `@import url("${link.href}");\n`;
        }
      }
    }
    return css;
  };

  const allImagesLoaded = (doc: Document) => {
    const imgs = Array.from(doc.images);
    if (imgs.length === 0) return Promise.resolve();
    return Promise.all(
      imgs.map(
        (img) =>
          new Promise<void>((resolve) => {
            if (img.complete) return resolve();
            img.addEventListener("load", () => resolve(), { once: true });
            img.addEventListener("error", () => resolve(), { once: true });
          }),
      ),
    );
  };

  const waitForExportRender = (): Promise<void> =>
    new Promise((resolve) => {
      const start = performance.now();
      const MAX = 3000;
      const tryOne = () => {
        const wrap = document.getElementById("receipt-export-wrap");
        const paper = wrap?.querySelector<HTMLElement>(".receipt-paper");
        if (wrap && paper && paper.offsetHeight > 0) return resolve();
        if (performance.now() - start > MAX) return resolve();
        requestAnimationFrame(() => {
          requestAnimationFrame(tryOne);
        });
      };
      tryOne();
    });

  const exportReceipt = async (mode: ExportMode): Promise<void> => {
    if (!receipt || !preview) return;
    if (exportingRef.current) return;
    exportingRef.current = true;
    exportKeyRef.current += 1;
    try {
      const snapshotPreview = hydrateReceiptForPreview(receipt, settings);
      setExportPreviewData(snapshotPreview);
      await waitForExportRender();
      const wrap = document.getElementById("receipt-export-wrap");
      const paper = wrap?.querySelector<HTMLElement>(".receipt-paper");
      const html =
        paper?.outerHTML ||
        document.querySelector<HTMLElement>(".receipt-paper")?.outerHTML ||
        "<p>No receipt content</p>";

      const paperStyles = `
        @page { size: A4; margin: 10mm 8mm; }
        html, body { background:#ffffff; margin:0; padding:0; }
        body * { visibility: hidden; }
        #receipt-print-area, #receipt-print-area * { visibility: visible; }
        #receipt-print-area { position: absolute; inset: 0; width: auto; margin: 0; padding: 12mm 8mm; overflow: visible; }
        .receipt-paper { box-shadow: none !important; margin: 0 auto; border: 1px solid #e2e8f0 !important; }
        @media print {
          body * { visibility: hidden !important; }
          #receipt-print-area, #receipt-print-area * { visibility: visible !important; }
          #receipt-print-area { position: absolute; inset: 0; overflow: visible; width: auto; padding: 8mm 6mm; }
          .receipt-paper { box-shadow: none !important; margin: 0 auto; max-width: none !important; border: 1px solid #e2e8f0 !important; }
          .print\\:hidden { display:none !important; }
          [data-sonner-toaster] { display:none !important; }
          table { display: table !important; width: 100% !important; table-layout: fixed !important; }
          thead, tbody, tfoot, tr, td, th { display: revert !important; }
          tr { page-break-inside: avoid; }
          thead { display: table-header-group; }
          tfoot { display: table-footer-group; }
          .gradient-primary {
            background-image: linear-gradient(135deg, oklch(0.55 0.22 265), oklch(0.68 0.2 275)) !important;
            background-color: oklch(0.55 0.22 265) !important;
            color: oklch(0.99 0 0) !important;
          }
          .gradient-primary * { color: oklch(0.99 0 0) !important; }
        }
      `;

      const printWin = window.open(
        "",
        "_blank",
        mode === "download"
          ? "width=900,height=1200,menubar=yes,toolbar=yes"
          : "width=900,height=1200",
      );
      if (!printWin) {
        toast.error("Popup blocked", {
          description: "Please allow popups so the receipt can open for print.",
        });
        window.focus();
        window.print();
        return;
      }
      printWin.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${receipt.receiptNumber} · ReceiptAI</title><meta name="viewport" content="width=device-width, initial-scale=1"><style>${collectStylesheets(document)}</style><style>${paperStyles}</style></head><body><div id="receipt-print-area">${html}</div></body></html>`);
      printWin.document.close();
      await allImagesLoaded(printWin.document);
      await new Promise((r) => setTimeout(r, WAIT_EXPORT_MS));
      try {
        printWin.focus();
        printWin.print();
      } catch {
        window.focus();
        window.print();
      }
    } finally {
      exportingRef.current = false;
      setTimeout(() => setExportPreviewData(null), 1200);
    }
  };

  const handlePrint = () => {
    void exportReceipt("print");
    toast.info("Opening print…", { description: "Tip: Choose 'Save as PDF' to download." });
  };
  const handleDownload = async () => {
    await exportReceipt("download");
  };

  useEffect(() => {
    if (!receipt) return;
  }, [receipt?.id]);

  if (!receipt || !preview) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link to="/" className="inline-flex items-center hover:text-foreground transition-colors">
            <ArrowLeft className="mr-1 h-3.5 w-3.5" /> Dashboard
          </Link>
          <ChevronRight className="h-3.5 w-3.5 opacity-50" />
          <span className="text-foreground">Receipt not found</span>
        </div>
        <Card>
          <CardContent className="p-10">
            <EmptyState
              icon={Receipt}
              title="Receipt not found"
              description="This receipt may have been deleted or its link is invalid."
              action={
                <div className="flex flex-wrap justify-center gap-2">
                  <Button asChild variant="outline" className="rounded-full">
                    <Link to="/">
                      <ArrowLeft className="mr-2 h-4 w-4" /> Go to dashboard
                    </Link>
                  </Button>
                  <Button asChild className="gradient-primary rounded-full text-primary-foreground">
                    <Link to="/create">
                      <FilePlus2 className="mr-2 h-4 w-4" /> Create a new receipt
                    </Link>
                  </Button>
                </div>
              }
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  const amountWords = numberToWords(receipt.grandTotal);

  return (
    <div className="space-y-6 print:hidden">
      <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        <Link to="/" className="inline-flex items-center hover:text-foreground transition-colors">
          <ArrowLeft className="mr-1 h-3.5 w-3.5" /> Dashboard
        </Link>
        <ChevronRight className="h-3.5 w-3.5 opacity-50" />
        <Link to="/" className="inline-flex items-center hover:text-foreground transition-colors">
          Receipts
        </Link>
        <ChevronRight className="h-3.5 w-3.5 opacity-50" />
        <span className="text-foreground font-medium">{receipt.receiptNumber}</span>
      </div>

      <PageHeader
        eyebrow="Receipt details"
        title={receipt.receiptNumber}
        description={
          (receipt.customerName || "Walk-in customer") +
          " · " +
          formatDateTime(new Date(receipt.dateIso))
        }
        actions={
          <>
            <Button
              asChild
              variant="outline"
              size="sm"
              className="rounded-full print:hidden"
            >
              <Link to="/create">
                <Edit2 className="mr-2 h-3.5 w-3.5" /> New receipt
              </Link>
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="rounded-full print:hidden"
              onClick={handleShare}
            >
              <Share2 className="mr-2 h-3.5 w-3.5" /> Share
            </Button>
            <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-full text-destructive hover:text-destructive-foreground hover:bg-destructive/90 border-destructive/30 print:hidden"
                >
                  <Trash2 className="mr-2 h-3.5 w-3.5" /> Delete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete receipt?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently remove {receipt.receiptNumber}. This action cannot be
                    undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDelete}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <Button
              variant="outline"
              size="sm"
              className="rounded-full print:hidden"
              onClick={handlePrint}
            >
              <Printer className="mr-2 h-3.5 w-3.5" /> Print
            </Button>
            <Button
              size="sm"
              className="gradient-primary rounded-full text-primary-foreground print:hidden"
              onClick={handleDownload}
            >
              <Download className="mr-2 h-3.5 w-3.5" /> Download PDF
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Grand total"
          value={formatCurrency(receipt.grandTotal, settings.currency)}
          hint={amountWords}
          icon={Receipt}
          accent="primary"
        />
        <StatCard
          label="Items"
          value={receipt.items.length}
          hint={formatCurrency(receipt.subtotal, settings.currency) + " subtotal"}
          icon={FilePlus2}
          accent="success"
        />
        <StatCard
          label="GST"
          value={
            receipt.gstEnabled
              ? formatCurrency(receipt.gstAmount, settings.currency)
              : "Not applied"
          }
          hint={receipt.gstEnabled ? `@ ${receipt.gstRate}% on ${formatCurrency(receipt.taxableAmount, settings.currency)}` : "Exempt"}
          icon={Receipt}
          accent="warning"
        />
        <StatCard
          label="Created on"
          value={formatDateTime(new Date(receipt.dateIso)).split(",")[0]}
          hint={formatDateTime(new Date(receipt.dateIso)).split(", ")[1] ?? ""}
          icon={Receipt}
          accent="muted"
        />
      </div>

      <div className="mx-auto w-full max-w-[220mm]">
        <ReceiptPreview key={receipt.id} {...preview} />
      </div>

      {exportPreviewData ? (
        <div
          id="receipt-export-wrap"
          aria-hidden
          style={{
            position: "fixed",
            left: "-99999px",
            top: "0",
            width: "210mm",
            minHeight: "297mm",
            background: "#ffffff",
            overflow: "visible",
            opacity: "1",
            visibility: "visible",
            display: "block",
            pointerEvents: "none",
            zIndex: -1,
          }}
        >
          <ReceiptPreview
            key={`export-snap-${exportKeyRef.current}`}
            {...exportPreviewData}
          />
        </div>
      ) : null}
    </div>
  );
}
