import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Save,
  Printer,
  Download,
  Eye,
  X,
  User,
  FileText,
  Percent,
  Truck,
  Receipt,
  Calculator,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/components/common/PageHeader";
import { Switch } from "@/components/ui/switch";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerClose,
} from "@/components/ui/drawer";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useBusinessSettings } from "@/lib/business-settings";
import { useReceipts, type ReceiptItem, computeReceiptTotals } from "@/lib/receipt-store";
import { formatCurrency, formatDateTime, numberToWords } from "@/lib/receipt-utils";
import { ReceiptPreview, hydrateReceiptForPreview } from "@/components/receipt/ReceiptPreview";

export const Route = createFileRoute("/create")({
  head: () => ({
    meta: [
      { title: "Create Receipt · ReceiptAI" },
      {
        name: "description",
        content: "Compose a new professional receipt with itemized details, live preview and instant export.",
      },
      { property: "og:title", content: "Create Receipt · ReceiptAI" },
      {
        property: "og:description",
        content: "Compose a new professional receipt in seconds with live preview.",
      },
    ],
  }),
  component: CreateReceipt,
});

const customerSchema = z.object({
  customerName: z.string().trim().min(1, "Customer name is required").max(120),
  customerPhone: z
    .string()
    .trim()
    .max(30)
    .optional()
    .or(z.literal("")),
  customerEmail: z
    .string()
    .trim()
    .max(255)
    .optional()
    .or(z.literal(""))
    .refine(
      (v) => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
      "Invalid email address",
    ),
  customerAddress: z.string().max(300).optional().or(z.literal("")),
});

type CustomerValues = z.infer<typeof customerSchema>;

const GST_PRESETS = [5, 12, 18, 28];

function itemUid() {
  return "it_" + Math.random().toString(36).slice(2, 10);
}

function newItem(): ReceiptItem {
  return {
    id: itemUid(),
    name: "",
    description: "",
    quantity: 1,
    unitPrice: 0,
  };
}

function CreateReceipt() {
  const router = useRouter();
  const { settings: business } = useBusinessSettings();
  const { addReceipt, getNextReceiptNumber } = useReceipts();

  const previewRef = useRef<HTMLDivElement | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadingReceiptNo, setLoadingReceiptNo] = useState(true);
  const [receiptNumber, setReceiptNumber] = useState<string>("");
  const receiptDate = useMemo(() => new Date(), []);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<CustomerValues>({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      customerName: "",
      customerPhone: "",
      customerEmail: "",
      customerAddress: "",
    },
  });

  const [items, setItems] = useState<ReceiptItem[]>(() => [newItem()]);
  const [gstEnabled, setGstEnabled] = useState(false);
  const [gstRate, setGstRate] = useState<number>(18);
  const [customGst, setCustomGst] = useState(false);
  const [customGstVal, setCustomGstVal] = useState<string>("");
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [shipping, setShipping] = useState<number>(0);
  const [notes, setNotes] = useState<string>("Thank you for your purchase!");

  const customerName = watch("customerName");
  const customerPhone = watch("customerPhone");
  const customerEmail = watch("customerEmail");
  const customerAddress = watch("customerAddress");

  const totals = useMemo(
    () => computeReceiptTotals(items, gstEnabled, gstRate, discountPercent, shipping),
    [items, gstEnabled, gstRate, discountPercent, shipping],
  );

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const n = await getNextReceiptNumber();
        if (alive) setReceiptNumber(n);
      } finally {
        if (alive) setLoadingReceiptNo(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [getNextReceiptNumber]);

  // --- Items helpers ---
  const focusItemRef = useRef<string | null>(null);
  const inputRefsMap = useRef<Map<string, HTMLInputElement>>(new Map());

  useEffect(() => {
    if (focusItemRef.current) {
      const el = inputRefsMap.current.get(focusItemRef.current);
      if (el) el.focus();
      focusItemRef.current = null;
    }
  }, [items]);

  const updateItem = (id: string, patch: Partial<ReceiptItem>) => {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  };
  const addItem = () => {
    const it = newItem();
    focusItemRef.current = it.id;
    setItems((prev) => [...prev, it]);
  };
  const removeItem = (id: string) => {
    setItems((prev) => {
      if (prev.length <= 1) return [newItem()];
      return prev.filter((it) => it.id !== id);
    });
  };

  // --- GST helpers ---
  const selectGstPreset = (val: number) => {
    setGstRate(val);
    setCustomGst(false);
    setCustomGstVal("");
  };
  const applyCustomGst = (raw: string) => {
    setCustomGstVal(raw);
    const n = parseFloat(raw);
    if (!isNaN(n) && n >= 0 && n <= 100) {
      setGstRate(n);
      setCustomGst(true);
    } else if (raw === "") {
      setCustomGst(false);
    }
  };

  // --- Validation beyond customer ---
  const getFormErrors = (): string[] => {
    const errs: string[] = [];
    const validItems = items.filter(
      (it) => it.name.trim().length > 0 && Number(it.quantity) > 0 && Number(it.unitPrice) > 0,
    );
    if (validItems.length === 0) errs.push("Add at least one item with name, qty > 0 and price > 0.");
    for (const it of items) {
      if (it.name.trim().length === 0 && (Number(it.quantity) > 0 || Number(it.unitPrice) > 0)) {
        errs.push("One or more items are missing a name.");
        break;
      }
    }
    return errs;
  };

  // --- Actions ---
  const buildPayload = () => {
    const cleanItems = items
      .filter((it) => it.name.trim().length > 0 && Number(it.quantity) > 0 && Number(it.unitPrice) > 0)
      .map((it) => ({
        ...it,
        name: it.name.trim(),
        description: it.description.trim(),
        quantity: Number(it.quantity) || 0,
        unitPrice: Number(it.unitPrice) || 0,
      }));
    const cleanedTotals = computeReceiptTotals(
      cleanItems,
      gstEnabled,
      gstRate,
      discountPercent,
      shipping,
    );
    return {
      customerName: customerName.trim(),
      customerPhone: customerPhone?.trim() ?? "",
      customerEmail: customerEmail?.trim() ?? "",
      customerAddress: customerAddress?.trim() ?? "",
      items: cleanItems,
      gstEnabled,
      gstRate: gstEnabled ? gstRate : 0,
      discountPercent: Number(discountPercent) || 0,
      shipping: Number(shipping) || 0,
      ...cleanedTotals,
      notes: notes.trim(),
    };
  };

  const handleSave = async (cust: CustomerValues) => {
    const extra = getFormErrors();
    if (extra.length > 0) {
      for (const e of extra) toast.error(e);
      return;
    }
    setSaving(true);
    try {
      const payload = buildPayload();
      const { receipt: saved, api } = await addReceipt({ ...payload, ...cust });
      if (api && !api.success) {
        toast.warning("Saved locally (offline)", {
          description: api.message || "Could not reach the server.",
        });
      } else {
        toast.success("Receipt saved", {
          description: `${saved.receiptNumber} has been added to your dashboard.`,
        });
      }
      setTimeout(() => {
        router.navigate({ to: "/" });
      }, 350);
    } catch (e) {
      console.error(e);
      toast.error("Couldn't save receipt. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = async () => {
    const payload = buildPayload();
    const previewData = hydrateReceiptForPreview(
      {
        ...payload,
        receiptNumber,
        dateIso: receiptDate.toISOString(),
      },
      business,
    );
    const safeTitle = `Receipt_${receiptNumber.replace(/[^A-Za-z0-9\-]/g, "")}`;
    const title = document.title;
    document.title = safeTitle;
    setTimeout(() => {
      document.title = title;
    }, 100);
    toast.message("Tip: Choose 'Save as PDF' in the print dialog", {
      description: `File name will be: ${safeTitle}.pdf`,
    });
    window.print();
  };

  const previewPayload = useMemo(() => {
    const p = buildPayload();
    return hydrateReceiptForPreview(
      {
        ...p,
        receiptNumber,
        dateIso: receiptDate.toISOString(),
      },
      business,
    );
  }, [
    business,
    receiptNumber,
    receiptDate,
    items,
    gstEnabled,
    gstRate,
    discountPercent,
    shipping,
    notes,
    customerName,
    customerPhone,
    customerEmail,
    customerAddress,
  ]);

  return (
    <div className="space-y-6 pb-36 lg:pb-10">
      <PageHeader
        eyebrow="New Receipt"
        title="Create receipt"
        description="Fill in the details on the left. The preview on the right updates live."
        actions={
          <>
            <Button asChild variant="outline" className="rounded-full">
              <Link to="/">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to dashboard
              </Link>
            </Button>
            <div className="hidden sm:flex items-center gap-2">
              <Drawer open={previewOpen} onOpenChange={setPreviewOpen}>
                <Button
                  variant="outline"
                  className="rounded-full lg:hidden"
                  onClick={() => setPreviewOpen(true)}
                >
                  <Eye className="mr-2 h-4 w-4" />
                  Preview
                </Button>
              </Drawer>
              <Button
                variant="outline"
                className="rounded-full"
                onClick={handlePrint}
              >
                <Printer className="mr-2 h-4 w-4" />
                Print
              </Button>
              <Button
                variant="outline"
                className="rounded-full"
                onClick={handleDownload}
              >
                <Download className="mr-2 h-4 w-4" />
                Download PDF
              </Button>
              <Button
                className="gradient-primary rounded-full text-primary-foreground shadow-elegant"
                onClick={handleSubmit(handleSave)}
                disabled={saving}
              >
                <Save className="mr-2 h-4 w-4" />
                {saving ? "Saving…" : "Save Receipt"}
              </Button>
            </div>
          </>
        }
      />

      {/* Layout grid */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-5">
        {/* LEFT: Form */}
        <div className="xl:col-span-3 space-y-6">
          {/* Receipt meta */}
          <Card className="shadow-soft print:hidden">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Receipt className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-base">Receipt details</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Auto-generated — shared with customer & QR.
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Receipt number</Label>
                <div className="flex items-center rounded-lg border border-border bg-muted/40 px-3 py-2">
                  <span className="font-mono text-sm font-semibold">{receiptNumber}</span>
                  <Badge variant="outline" className="ml-auto rounded-full text-[10px] uppercase tracking-wider">
                    Auto
                  </Badge>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Date &amp; time</Label>
                <div className="flex items-center rounded-lg border border-border bg-muted/40 px-3 py-2">
                  <span className="text-sm">{formatDateTime(receiptDate)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Customer */}
          <Card className="shadow-soft print:hidden">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <User className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-base">Customer information</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Printed at the top of the receipt.
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">
                  Customer name
                  <span className="ml-0.5 text-destructive">*</span>
                </Label>
                <Input
                  placeholder="Rahul Sharma"
                  className={"rounded-xl " + (errors.customerName ? "border-destructive" : "")}
                  {...register("customerName")}
                />
                {errors.customerName && (
                  <p className="text-xs font-medium text-destructive">
                    {errors.customerName.message}
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Phone number</Label>
                <Input
                  placeholder="+91 98xxxxxxxx"
                  className="rounded-xl"
                  {...register("customerPhone")}
                />
                {errors.customerPhone && (
                  <p className="text-xs font-medium text-destructive">
                    {errors.customerPhone.message}
                  </p>
                )}
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label className="text-sm font-medium">Email address</Label>
                <Input
                  type="email"
                  placeholder="customer@example.com"
                  className="rounded-xl"
                  {...register("customerEmail")}
                />
                {errors.customerEmail && (
                  <p className="text-xs font-medium text-destructive">
                    {errors.customerEmail.message}
                  </p>
                )}
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label className="text-sm font-medium">Address</Label>
                <Textarea
                  rows={2}
                  placeholder="Optional — delivery or billing address"
                  className="rounded-xl"
                  {...register("customerAddress")}
                />
              </div>
            </CardContent>
          </Card>

          {/* Items */}
          <Card className="shadow-soft print:hidden">
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-base">Items</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Add product/service rows. Calculations are instant.
                    </p>
                  </div>
                </div>
                <Button variant="outline" size="sm" className="rounded-full" onClick={addItem}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add item
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Desktop table */}
              <div className="hidden sm:block overflow-hidden rounded-xl border border-border">
                <div className="grid grid-cols-[40px_minmax(0,1fr)_80px_110px_110px_44px] items-center gap-2 px-3 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground bg-muted/40">
                  <div>#</div>
                  <div>Item / Description</div>
                  <div className="text-right">Qty</div>
                  <div className="text-right">Unit Price</div>
                  <div className="text-right">Amount</div>
                  <div></div>
                </div>
                <Separator />
                {items.map((it, idx) => {
                  const amt =
                    (Number(it.quantity) || 0) * (Number(it.unitPrice) || 0);
                  return (
                    <div key={it.id}>
                      <div className="grid grid-cols-[40px_minmax(0,1fr)_80px_110px_110px_44px] items-start gap-2 px-3 py-3">
                        <div className="pt-2.5 text-sm text-muted-foreground font-mono">
                          {idx + 1}
                        </div>
                        <div className="space-y-2">
                          <Input
                            placeholder="Item name"
                            className="rounded-lg text-sm"
                            value={it.name}
                            onChange={(e) => updateItem(it.id, { name: e.target.value })}
                            ref={(el) => {
                              if (el) inputRefsMap.current.set(it.id, el);
                            }}
                          />
                          <Input
                            placeholder="Description (optional)"
                            className="rounded-lg text-sm bg-muted/30"
                            value={it.description}
                            onChange={(e) =>
                              updateItem(it.id, { description: e.target.value })
                            }
                          />
                        </div>
                        <div className="pt-0.5">
                          <Input
                            type="number"
                            min={0}
                            step="0.01"
                            inputMode="decimal"
                            className="rounded-lg text-right tabular-nums text-sm"
                            value={it.quantity}
                            onChange={(e) =>
                              updateItem(it.id, {
                                quantity: parseFloat(e.target.value) || 0,
                              })
                            }
                          />
                        </div>
                        <div className="pt-0.5">
                          <Input
                            type="number"
                            min={0}
                            step="0.01"
                            inputMode="decimal"
                            className="rounded-lg text-right tabular-nums text-sm"
                            value={it.unitPrice}
                            onChange={(e) =>
                              updateItem(it.id, {
                                unitPrice: parseFloat(e.target.value) || 0,
                              })
                            }
                          />
                        </div>
                        <div className="pt-2.5 text-right text-sm font-semibold tabular-nums">
                          {formatCurrency(amt, business.currency)}
                        </div>
                        <div className="pt-1">
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="h-9 w-9 rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                            onClick={() => removeItem(it.id)}
                            title="Remove item"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <Separator />
                    </div>
                  );
                })}
              </div>

              {/* Mobile cards */}
              <div className="sm:hidden space-y-3">
                {items.map((it, idx) => {
                  const amt =
                    (Number(it.quantity) || 0) * (Number(it.unitPrice) || 0);
                  return (
                    <div
                      key={it.id}
                      className="rounded-xl border border-border p-3 space-y-2.5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <Badge variant="outline" className="rounded-full shrink-0">
                            #{idx + 1}
                          </Badge>
                          <span className="text-sm font-semibold tabular-nums truncate">
                            {formatCurrency(amt, business.currency)}
                          </span>
                        </div>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0"
                          onClick={() => removeItem(it.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <Input
                        placeholder="Item name *"
                        className="rounded-lg text-sm"
                        value={it.name}
                        onChange={(e) => updateItem(it.id, { name: e.target.value })}
                        ref={(el) => {
                          if (el) inputRefsMap.current.set(it.id, el);
                        }}
                      />
                      <Input
                        placeholder="Description (optional)"
                        className="rounded-lg text-sm bg-muted/30"
                        value={it.description}
                        onChange={(e) =>
                          updateItem(it.id, { description: e.target.value })
                        }
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">Qty</Label>
                          <Input
                            type="number"
                            min={0}
                            step="0.01"
                            inputMode="decimal"
                            className="rounded-lg text-right tabular-nums text-sm"
                            value={it.quantity}
                            onChange={(e) =>
                              updateItem(it.id, {
                                quantity: parseFloat(e.target.value) || 0,
                              })
                            }
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">Rate</Label>
                          <Input
                            type="number"
                            min={0}
                            step="0.01"
                            inputMode="decimal"
                            className="rounded-lg text-right tabular-nums text-sm"
                            value={it.unitPrice}
                            onChange={(e) =>
                              updateItem(it.id, {
                                unitPrice: parseFloat(e.target.value) || 0,
                              })
                            }
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
                <Button
                  variant="outline"
                  className="w-full rounded-full"
                  onClick={addItem}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add another item
                </Button>
              </div>

              {/* Totals inline (form) */}
              <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-2">
                <div className="flex items-center gap-2 mb-1">
                  <Calculator className="h-4 w-4 text-primary" />
                  <p className="text-sm font-semibold">Totals (live)</p>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Subtotal</p>
                    <p className="font-semibold tabular-nums">
                      {formatCurrency(totals.subtotal, business.currency)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">
                      {gstEnabled ? `GST (${gstRate}%)` : "GST"}
                    </p>
                    <p className="font-semibold tabular-nums">
                      {formatCurrency(totals.gstAmount, business.currency)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Shipping</p>
                    <p className="font-semibold tabular-nums">
                      {formatCurrency(Number(shipping) || 0, business.currency)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Grand Total</p>
                    <p className="font-bold text-primary text-base tabular-nums">
                      {formatCurrency(totals.grandTotal, business.currency)}
                    </p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground pt-1">
                  <span className="font-medium">In words:</span>{" "}
                  {totals.grandTotal > 0
                    ? numberToWords(totals.grandTotal, business.currency)
                    : "—"}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* GST, Discount, Shipping, Notes */}
          <Card className="shadow-soft print:hidden">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Percent className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-base">Taxes, discounts &amp; notes</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Configure charges before saving.
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              {/* GST Toggle */}
              <div className="sm:col-span-2 rounded-xl border border-border p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="space-y-0.5">
                      <p className="text-sm font-semibold">Apply GST</p>
                      <p className="text-xs text-muted-foreground">
                        Toggle to include Goods &amp; Services Tax.
                      </p>
                    </div>
                  </div>
                  <Switch checked={gstEnabled} onCheckedChange={setGstEnabled} />
                </div>
                {gstEnabled && (
                  <div className="space-y-2 pt-1">
                    <Label className="text-sm font-medium">GST rate</Label>
                    <div className="flex flex-wrap items-center gap-2">
                      {GST_PRESETS.map((r) => (
                        <Button
                          key={r}
                          type="button"
                          size="sm"
                          variant={!customGst && gstRate === r ? "default" : "outline"}
                          className={
                            "rounded-full " +
                            (!customGst && gstRate === r
                              ? "gradient-primary text-primary-foreground"
                              : "")
                          }
                          onClick={() => selectGstPreset(r)}
                        >
                          {r}%
                        </Button>
                      ))}
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          step="0.01"
                          placeholder="Custom %"
                          className="w-28 rounded-full text-sm tabular-nums text-right"
                          value={customGstVal}
                          onChange={(e) => applyCustomGst(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <Percent className="h-3.5 w-3.5 text-muted-foreground" />
                  Discount (%)
                </Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  step="0.01"
                  placeholder="0"
                  className="rounded-xl tabular-nums text-right"
                  value={discountPercent}
                  onChange={(e) => setDiscountPercent(parseFloat(e.target.value) || 0)}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <Truck className="h-3.5 w-3.5 text-muted-foreground" />
                  Shipping / Handling
                </Label>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  placeholder="0"
                  className="rounded-xl tabular-nums text-right"
                  value={shipping}
                  onChange={(e) => setShipping(parseFloat(e.target.value) || 0)}
                />
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <Label className="text-sm font-medium">Notes / Terms</Label>
                <Textarea
                  rows={3}
                  placeholder="Thank you for your purchase! Goods once sold cannot be returned."
                  className="rounded-xl"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* RIGHT: Preview (desktop) */}
        <div className="xl:col-span-2 print:col-span-5 print:block">
          <div className="hidden xl:flex items-center justify-between mb-3 print:hidden">
            <div>
              <h2 className="text-base font-semibold tracking-tight">Live preview</h2>
              <p className="text-sm text-muted-foreground">
                Updates as you type.
              </p>
            </div>
          </div>
          <div
            ref={previewRef}
            className="xl:sticky xl:top-20 rounded-2xl shadow-elegant border border-border overflow-hidden bg-slate-50 print:shadow-none print:border-none print:bg-white print:rounded-none"
            id="receipt-print-wrap"
          >
            <div className="max-h-[calc(100vh-7rem)] xl:max-h-[calc(100vh-6rem)] overflow-auto xl:overscroll-contain print:max-h-none print:overflow-visible">
              <ReceiptPreview {...previewPayload} />
            </div>
          </div>
        </div>
      </div>

      {/* Sticky mobile actions */}
      <div className="sm:hidden fixed bottom-0 inset-x-0 z-40 border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 px-4 py-3 print:hidden">
        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" className="rounded-full" onClick={() => setPreviewOpen(true)}>
            <Eye className="mr-2 h-4 w-4" />
            Preview
          </Button>
          <Button variant="outline" className="rounded-full" onClick={handlePrint}>
            <Printer className="mr-2 h-4 w-4" />
            Print
          </Button>
          <Button variant="outline" className="rounded-full col-span-2" onClick={handleDownload}>
            <Download className="mr-2 h-4 w-4" />
            Download PDF (use Print → Save as PDF)
          </Button>
          <Button
            className="gradient-primary rounded-full text-primary-foreground shadow-elegant col-span-2"
            onClick={handleSubmit(handleSave)}
            disabled={saving}
          >
            <Save className="mr-2 h-4 w-4" />
            {saving ? "Saving…" : "Save Receipt"}
          </Button>
        </div>
      </div>

      {/* Mobile Preview Drawer */}
      <Drawer open={previewOpen} onOpenChange={setPreviewOpen}>
        <DrawerContent className="h-[92vh]">
          <DrawerHeader className="text-left px-4 pt-4 pb-2">
            <div className="flex items-center justify-between">
              <div>
                <DrawerTitle>Receipt preview</DrawerTitle>
                <DrawerDescription>{receiptNumber} · Tap close to return</DrawerDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="rounded-full" onClick={handlePrint}>
                  <Printer className="mr-2 h-3.5 w-3.5" />
                  Print
                </Button>
                <DrawerClose asChild>
                  <Button variant="ghost" size="icon" className="rounded-full h-9 w-9">
                    <X className="h-4 w-4" />
                  </Button>
                </DrawerClose>
              </div>
            </div>
          </DrawerHeader>
          <div className="overflow-auto px-3 pb-6">
            <ReceiptPreview {...previewPayload} />
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
