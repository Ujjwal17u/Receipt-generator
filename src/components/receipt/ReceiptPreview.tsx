import type { BusinessSettings } from "@/lib/business-settings";
import type { Receipt, ReceiptItem } from "@/lib/receipt-store";
git remote add origin https://github.com/YOUR_USERNAME/ai-receipt-generator.gimport { formatCurrency, formatDateTime, numberToWords } from "@/lib/receipt-utils";
import { useEffect, useState } from "react";
import QRCode from "qrcode";

interface ReceiptPreviewProps {
  business: BusinessSettings;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  customerAddress: string;
  receiptNumber: string;
  receiptDate: Date;
  items: ReceiptItem[];
  subtotal: number;
  discountAmount: number;
  discountPercent: number;
  taxableAmount: number;
  gstEnabled: boolean;
  gstRate: number;
  gstAmount: number;
  shipping: number;
  grandTotal: number;
  notes: string;
  id?: string;
}

function buildQRData(p: ReceiptPreviewProps) {
  return [
    `ID: ${p.id || "new"}`,
    `Receipt: ${p.receiptNumber}`,
    `Date: ${formatDateTime(p.receiptDate)}`,
    `Customer: ${p.customerName || "Walk-in"}`,
    `Total: ${formatCurrency(p.grandTotal, p.business.currency)}`,
  ].join("\n");
}

function QRCodeImage({ value, size = 96 }: { value: string; size?: number }) {
  const [dataUrl, setDataUrl] = useState<string>("");
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const url = await QRCode.toDataURL(value, {
          errorCorrectionLevel: "M",
          margin: 1,
          width: size,
          color: { dark: "#0f172a", light: "#ffffff" },
        });
        if (alive) setDataUrl(url);
      } catch {
        if (alive) setDataUrl("");
      }
    })();
    return () => {
      alive = false;
    };
  }, [value, size]);
  if (!dataUrl) {
    return (
      <div
        style={{
          width: size,
          height: size,
          background:
            "repeating-conic-gradient(#cbd5e1 0% 25%, #ffffff 0% 50%) 50% / 16px 16px",
          borderRadius: 4,
        }}
        aria-label="QR code loading"
      />
    );
  }
  return (
    <img
      src={dataUrl}
      alt={`Receipt ${value} QR Code`}
      width={size}
      height={size}
      style={{ imageRendering: "pixelated", display: "block" }}
      className="rounded-sm"
    />
  );
}

export function ReceiptPreview(props: ReceiptPreviewProps) {
  const {
    business,
    customerName,
    customerPhone,
    customerEmail,
    customerAddress,
    receiptNumber,
    receiptDate,
    items,
    subtotal,
    discountAmount,
    discountPercent,
    taxableAmount,
    gstEnabled,
    gstRate,
    gstAmount,
    shipping,
    grandTotal,
    notes,
    id,
  } = props;

  const fullAddr = [
    business.addressLine,
    business.city,
    business.state,
    business.country,
    business.postalCode,
  ]
    .filter(Boolean)
    .join(", ");

  const contact = [business.phone, business.email].filter(Boolean).join(" · ");

  const qrData = buildQRData({ ...props, id: id || receiptNumber });

  return (
    <div className="receipt-paper w-full bg-white text-slate-900 print:text-black mx-auto" id="receipt-print-area">
      <div className="space-y-6 p-6 sm:p-10">
        {/* HEADER */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            {business.logoDataUrl ? (
              <img
                src={business.logoDataUrl}
                alt="Logo"
                className="h-14 w-14 rounded-xl object-cover border border-slate-200 print:border-slate-300"
              />
            ) : (
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-slate-100 print:bg-slate-50 border border-slate-200 print:border-slate-300">
                <span className="text-lg font-bold text-slate-600">
                  {(business.companyName || "R").charAt(0).toUpperCase()}
                </span>
              </div>
            )}
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight leading-tight">
                {business.companyName || "Your Company Name"}
              </h1>
              {business.ownerName && (
                <p className="text-sm text-slate-600 mt-0.5">{business.ownerName}</p>
              )}
              {fullAddr && <p className="text-xs sm:text-sm text-slate-600 mt-1">{fullAddr}</p>}
              {contact && <p className="text-xs sm:text-sm text-slate-600 mt-1">{contact}</p>}
              {business.gstNumber && (
                <p className="text-xs sm:text-sm font-mono text-slate-600 mt-1">
                  GST: {business.gstNumber}
                </p>
              )}
              {business.website && (
                <p className="text-xs sm:text-sm text-slate-600 mt-1">{business.website}</p>
              )}
            </div>
          </div>

          <div className="text-left sm:text-right space-y-1">
            <div className="inline-block rounded-lg bg-slate-50 border border-slate-200 print:border-slate-300 px-3 py-2">
              <p className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold">
                Receipt No.
              </p>
              <p className="text-base sm:text-lg font-bold font-mono tracking-tight">
                {receiptNumber}
              </p>
            </div>
            <p className="text-xs sm:text-sm text-slate-600 mt-2">
              {formatDateTime(receiptDate)}
            </p>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t-2 border-dashed border-slate-300 print:border-slate-400" />

        {/* CUSTOMER */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="rounded-xl bg-slate-50/60 p-4 border border-slate-200 print:border-slate-300">
            <p className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold mb-1.5">
              Bill To
            </p>
            <p className="font-semibold text-base">
              {customerName || "Walk-in Customer"}
            </p>
            {customerPhone && (
              <p className="text-sm text-slate-600 mt-0.5">{customerPhone}</p>
            )}
            {customerEmail && (
              <p className="text-sm text-slate-600 mt-0.5 break-all">{customerEmail}</p>
            )}
            {customerAddress && (
              <p className="text-sm text-slate-600 mt-0.5 whitespace-pre-line">
                {customerAddress}
              </p>
            )}
          </div>
          <div className="rounded-xl bg-slate-50/60 p-4 border border-slate-200 print:border-slate-300 sm:justify-self-end sm:w-full sm:max-w-sm">
            <p className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold mb-1.5">
              Summary
            </p>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between gap-3">
                <span className="text-slate-600">Items</span>
                <span className="font-medium">{items.length}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-slate-600">Qty total</span>
                <span className="font-medium">
                  {items.reduce((s, i) => s + (Number(i.quantity) || 0), 0)}
                </span>
              </div>
              {gstEnabled && (
                <div className="flex justify-between gap-3">
                  <span className="text-slate-600">GST</span>
                  <span className="font-medium">{gstRate}%</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ITEMS TABLE */}
        <div className="overflow-hidden rounded-xl border border-slate-200 print:border-slate-300">
          {/* Desktop */}
          <div className="hidden sm:block">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-700">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold w-[40px]">#</th>
                  <th className="text-left px-4 py-3 font-semibold">Item</th>
                  <th className="text-right px-4 py-3 font-semibold w-[80px]">Qty</th>
                  <th className="text-right px-4 py-3 font-semibold w-[120px]">Rate</th>
                  <th className="text-right px-4 py-3 font-semibold w-[120px]">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 print:divide-slate-300">
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                      No items added yet
                    </td>
                  </tr>
                ) : (
                  items.map((it, idx) => {
                    const amt = (Number(it.quantity) || 0) * (Number(it.unitPrice) || 0);
                    return (
                      <tr key={it.id} className="align-top">
                        <td className="px-4 py-3 text-slate-500">{idx + 1}</td>
                        <td className="px-4 py-3">
                          <p className="font-medium leading-snug">
                            {it.name || <span className="text-slate-400">Untitled</span>}
                          </p>
                          {it.description && (
                            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                              {it.description}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums">
                          {Number(it.quantity) || 0}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums">
                          {formatCurrency(Number(it.unitPrice) || 0, business.currency)}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums font-semibold">
                          {formatCurrency(amt, business.currency)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile */}
          <div className="sm:hidden divide-y divide-slate-200 print:divide-slate-300">
            {items.length === 0 ? (
              <div className="px-4 py-8 text-center text-slate-400 text-sm">
                No items added yet
              </div>
            ) : (
              items.map((it, idx) => {
                const amt = (Number(it.quantity) || 0) * (Number(it.unitPrice) || 0);
                return (
                  <div key={it.id} className="p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2">
                        <span className="text-xs text-slate-400 font-mono mt-0.5">
                          {idx + 1}.
                        </span>
                        <div className="min-w-0">
                          <p className="font-medium text-sm leading-snug">
                            {it.name || <span className="text-slate-400">Untitled</span>}
                          </p>
                          {it.description && (
                            <p className="text-xs text-slate-500 mt-0.5">{it.description}</p>
                          )}
                        </div>
                      </div>
                      <p className="font-semibold text-sm tabular-nums shrink-0">
                        {formatCurrency(amt, business.currency)}
                      </p>
                    </div>
                    <div className="mt-2 flex justify-between text-xs text-slate-500">
                      <span>
                        {Number(it.quantity) || 0} × {formatCurrency(Number(it.unitPrice) || 0, business.currency)}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* TOTALS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-start">
          {/* Amount in words */}
          <div className="rounded-xl bg-slate-50 border border-slate-200 print:border-slate-300 p-4">
            <p className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold mb-1.5">
              Total (in words)
            </p>
            <p className="font-semibold text-sm sm:text-base leading-relaxed text-slate-800">
              {grandTotal > 0
                ? numberToWords(grandTotal, business.currency)
                : "Zero " +
                  (business.currency === "INR" ? "Rupees" : business.currency === "USD" ? "Dollars" : "Currency") +
                  " Only"}
            </p>
            {notes && (
              <>
                <p className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold mt-4 mb-1.5">
                  Notes
                </p>
                <p className="text-sm text-slate-600 whitespace-pre-line leading-relaxed">
                  {notes}
                </p>
              </>
            )}
          </div>

          {/* Numbers */}
          <div className="rounded-xl border border-slate-200 print:border-slate-300 overflow-hidden">
            <div className="space-y-1.5 p-4 text-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="text-slate-600">Subtotal</span>
                <span className="tabular-nums">
                  {formatCurrency(subtotal, business.currency)}
                </span>
              </div>
              {discountPercent > 0 && (
                <div className="flex items-center justify-between gap-3">
                  <span className="text-slate-600">
                    Discount ({discountPercent}%)
                  </span>
                  <span className="tabular-nums text-success">
                    −{formatCurrency(discountAmount, business.currency)}
                  </span>
                </div>
              )}
              {discountPercent > 0 && (
                <div className="flex items-center justify-between gap-3">
                  <span className="text-slate-600">Taxable Amount</span>
                  <span className="tabular-nums">
                    {formatCurrency(taxableAmount, business.currency)}
                  </span>
                </div>
              )}
              {gstEnabled && (
                <div className="flex items-center justify-between gap-3">
                  <span className="text-slate-600">GST ({gstRate}%)</span>
                  <span className="tabular-nums">
                    {formatCurrency(gstAmount, business.currency)}
                  </span>
                </div>
              )}
              {shipping > 0 && (
                <div className="flex items-center justify-between gap-3">
                  <span className="text-slate-600">Shipping</span>
                  <span className="tabular-nums">
                    {formatCurrency(shipping, business.currency)}
                  </span>
                </div>
              )}
            </div>
            <div className="gradient-primary px-4 py-3 flex items-center justify-between gap-3">
              <span className="text-primary-foreground font-semibold">Grand Total</span>
              <span className="text-primary-foreground font-bold text-lg sm:text-xl tabular-nums">
                {formatCurrency(grandTotal, business.currency)}
              </span>
            </div>
          </div>
        </div>

        {/* QR + Signatures */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          <div className="rounded-xl border border-slate-200 print:border-slate-300 p-4 flex flex-col items-center justify-center text-center">
            <div className="bg-white p-2 rounded-lg border border-slate-200 print:border-slate-300">
              <QRCodeImage value={qrData} size={96} />
            </div>
            <p className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold mt-2">
              Verify Receipt
            </p>
            <p className="text-xs text-slate-500 mt-0.5 font-mono truncate w-full">
              {receiptNumber}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 print:border-slate-300 p-4 flex flex-col justify-between min-h-[140px]">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold">
                Authorized Signatory
              </p>
            </div>
            <div className="border-t border-slate-300 print:border-slate-400 pt-2 mt-auto">
              <p className="text-xs text-slate-500 text-center">Signature &amp; Stamp</p>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 print:border-slate-300 p-4 flex flex-col justify-between min-h-[140px]">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold">
                Customer Signature
              </p>
            </div>
            <div className="border-t border-slate-300 print:border-slate-400 pt-2 mt-auto">
              <p className="text-xs text-slate-500 text-center">Received with thanks</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-2 border-t border-slate-200 print:border-slate-300 text-center">
          <p className="text-xs text-slate-500">
            This is a computer-generated receipt. Thank you for your business!
          </p>
        </div>
      </div>
    </div>
  );
}

export function hydrateReceiptForPreview(
  r: Omit<Receipt, "id" | "receiptNumber" | "createdAt" | "dateIso"> & {
    receiptNumber?: string;
    dateIso?: string;
    id?: string;
  },
  business: BusinessSettings,
): ReceiptPreviewProps {
  return {
    business,
    customerName: r.customerName,
    customerPhone: r.customerPhone,
    customerEmail: r.customerEmail,
    customerAddress: r.customerAddress,
    receiptNumber: r.receiptNumber || "REC-XXXXXX-XXXX",
    receiptDate: r.dateIso ? new Date(r.dateIso) : new Date(),
    items: r.items,
    subtotal: r.subtotal,
    discountAmount: r.discountAmount,
    discountPercent: r.discountPercent,
    taxableAmount: r.taxableAmount,
    gstEnabled: r.gstEnabled,
    gstRate: r.gstRate,
    gstAmount: r.gstAmount,
    shipping: r.shipping,
    grandTotal: r.grandTotal,
    notes: r.notes,
    id: r.id,
  };
}
