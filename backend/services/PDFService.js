import QRService from "./QRService.js";
import { formatCurrency } from "../utils/currency.js";
import { formatDateTime } from "../utils/date.js";

export const PDFService = {
  buildHTML(receipt, business = null) {
    const qr = receipt.__qrDataURL || "";
    const b = business || receipt.businessId || {};
    const currency = receipt?.financials?.currency || "INR";
    const totalFormatted = formatCurrency(
      receipt?.financials?.grandTotal || 0,
      currency,
    );
    const businessAddress = [
      b.address?.addressLine,
      b.address?.city,
      b.address?.state,
      b.address?.country,
      b.address?.postalCode,
    ]
      .filter(Boolean)
      .join(", ");

    const rows = (receipt.items || [])
      .map(
        (it, i) => `
        <tr>
          <td>${i + 1}</td>
          <td>
            <div style="font-weight:600">${escapeHtml(it.itemName)}</div>
            ${it.description ? `<div style="opacity:.65;font-size:11px;margin-top:2px">${escapeHtml(it.description)}</div>` : ""}
          </td>
          <td style="text-align:right">${Number(it.quantity).toLocaleString("en-IN")}</td>
          <td style="text-align:right">${formatCurrency(it.unitPrice, currency)}</td>
          <td style="text-align:right;font-weight:600">${formatCurrency(it.total, currency)}</td>
        </tr>`,
      )
      .join("");

    return `<!doctype html><html><head><meta charset="utf-8"><title>Receipt ${receipt.receiptNumber || ""}</title>
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; color: #111827; margin: 0; padding: 24px; }
      .header { display:flex; align-items:flex-start; justify-content:space-between; gap:24px; padding-bottom:16px; border-bottom:2px solid #e5e7eb; }
      .company { max-width: 60%; }
      .company h1 { margin: 0 0 6px; font-size:22px; letter-spacing: .2px; }
      .company p { margin:2px 0; font-size:12px; color:#374151; }
      .logo { max-width: 140px; max-height: 80px; object-fit:contain; border-radius:6px; }
      .meta { margin-top:16px; display:grid; grid-template-columns:1fr 1fr; gap:16px; }
      .box { background:#f9fafb; border:1px solid #e5e7eb; border-radius:8px; padding:12px 14px; }
      .box h2 { font-size:12px; margin:0 0 8px; color:#6b7280; text-transform:uppercase; letter-spacing:.4px; font-weight:600; }
      .box p { margin:3px 0; font-size:13px; }
      table { width:100%; border-collapse: collapse; margin-top:18px; }
      th, td { border:1px solid #e5e7eb; padding:8px 10px; font-size:13px; vertical-align:top; }
      th { background:#f3f4f6; font-size:11px; letter-spacing:.3px; text-transform:uppercase; color:#374151; }
      .totals { width: 360px; margin-left:auto; margin-top:14px; }
      .totals tr td:first-child { color:#374151; }
      .totals tr td { border:none; padding:5px 10px; font-size:13px; }
      .grand { background: linear-gradient(90deg, #0ea5e9, #6366f1); color:#fff !important; font-weight:700; border-radius:8px; }
      .grand td { padding:10px 12px !important; color:#fff !important; }
      .words { margin-top:12px; padding:10px 12px; background:#f9fafb; border:1px solid #e5e7eb; border-radius:8px; font-size:13px; font-style:italic; }
      .footer { margin-top:22px; display:grid; grid-template-columns:1.2fr 1fr; gap:24px; align-items:end; }
      .notes { font-size:13px; color:#374151; white-space:pre-wrap; }
      .sigs { display:grid; grid-template-columns:1fr 1fr; gap:20px; }
      .sig { border-top:1px dashed #9ca3af; padding-top:28px; text-align:center; font-size:12px; color:#4b5563; }
      .qr { width:128px; height:128px; margin-left:auto; }
      .qr img { width:100%; height:100%; object-fit:contain; }
    </style></head><body>
      <div class="header">
        <div class="company">
          ${b.logo ? `<img src="${b.logo}" class="logo" alt="logo"/>` : ""}
          <h1>${escapeHtml(b.companyName || "Business Name")}</h1>
          ${b.ownerName ? `<p>Owner: ${escapeHtml(b.ownerName)}</p>` : ""}
          <p>${escapeHtml(businessAddress || "Address not set")}</p>
          <p>${[b.phone, b.email, b.website, b.gstNumber ? `GST: ${b.gstNumber}` : ""].filter(Boolean).join(" • ")}</p>
        </div>
        <div style="text-align:right">
          <div style="font-size:10px; color:#6b7280; text-transform:uppercase; letter-spacing:.6px">Receipt</div>
          <div style="font-size:18px; font-weight:700; color:#0f172a">#${escapeHtml(receipt.receiptNumber || "")}</div>
          <p style="margin:6px 0 2px; font-size:12px; color:#374151">Date: ${formatDateTime(receipt.receiptDate)}</p>
          <p style="margin:2px 0; font-size:12px; color:#374151">ID: ${escapeHtml(receipt.receiptId || "")}</p>
        </div>
      </div>

      <div class="meta">
        <div class="box">
          <h2>Bill To</h2>
          <p style="font-weight:600">${escapeHtml(receipt.customer?.name || "")}</p>
          ${receipt.customer?.phone ? `<p>📞 ${escapeHtml(receipt.customer.phone)}</p>` : ""}
          ${receipt.customer?.email ? `<p>✉️ ${escapeHtml(receipt.customer.email)}</p>` : ""}
          ${receipt.customer?.address ? `<p>📍 ${escapeHtml(receipt.customer.address)}</p>` : ""}
        </div>
        <div class="box">
          <h2>Summary</h2>
          <p>Items: <b>${receipt.items?.length || 0}</b></p>
          <p>Subtotal: <b>${formatCurrency(receipt.financials?.subtotal || 0, currency)}</b></p>
          <p>GST: <b>${receipt.financials?.gstEnabled ? `${receipt.financials.gstPercentage}%` : "OFF"}</b></p>
          <p style="font-weight:700">Grand Total: ${totalFormatted}</p>
        </div>
      </div>

      <table>
        <thead>
          <tr><th>#</th><th>Item</th><th style="width:80px;text-align:right">Qty</th><th style="width:120px;text-align:right">Rate</th><th style="width:120px;text-align:right">Amount</th></tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>

      <div style="display:flex; gap:24px; align-items:flex-start; margin-top:20px; flex-wrap:wrap">
        <div style="flex:1; min-width:300px">
          <div class="words">${escapeHtml(receipt.financials?.amountInWords || "")}</div>
        </div>
        <div class="totals">
          <table>
            <tbody>
              <tr><td>Subtotal</td><td style="text-align:right">${formatCurrency(receipt.financials?.subtotal || 0, currency)}</td></tr>
              ${Number(receipt.financials?.discount?.amount) > 0 ? `<tr><td>Discount (${receipt.financials.discount.percentage}%)</td><td style="text-align:right">- ${formatCurrency(receipt.financials.discount.amount, currency)}</td></tr>` : ""}
              ${Number(receipt.financials?.shipping) > 0 ? `<tr><td>Shipping</td><td style="text-align:right">${formatCurrency(receipt.financials.shipping, currency)}</td></tr>` : ""}
              <tr><td>Taxable</td><td style="text-align:right">${formatCurrency(receipt.financials?.taxableAmount || 0, currency)}</td></tr>
              ${receipt.financials?.gstEnabled ? `<tr><td>GST (${receipt.financials.gstPercentage}%)</td><td style="text-align:right">${formatCurrency(receipt.financials.gstAmount || 0, currency)}</td></tr>` : ""}
              <tr class="grand"><td>Grand Total</td><td style="text-align:right">${totalFormatted}</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="footer">
        <div style="display:flex; flex-direction:column; gap:12px">
          <div class="notes">${escapeHtml(receipt.notes || "")}</div>
          <div class="sigs">
            <div class="sig">Authorized Signature</div>
            <div class="sig">Customer Signature</div>
          </div>
        </div>
        ${qr ? `<div class="qr"><img src="${qr}" alt="QR" /></div>` : ""}
      </div>
    </body></html>`;
  },

  async renderForReceipt(receipt, business = null) {
    try {
      const { dataURL } = await QRService.forReceipt(receipt);
      const enhanced = { ...(receipt?.toObject?.() || receipt), __qrDataURL: dataURL };
      return this.buildHTML(enhanced, business);
    } catch {
      return this.buildHTML(receipt, business);
    }
  },
};

function escapeHtml(str) {
  if (str == null) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export default PDFService;
