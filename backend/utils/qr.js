import QRCode from "qrcode";

export async function generateQRDataURL(text, opts = {}) {
  if (!text) return "";
  try {
    return await QRCode.toDataURL(String(text), {
      errorCorrectionLevel: "M",
      margin: 1,
      width: opts.width || 256,
      color: {
        dark: opts.dark || "#000000",
        light: opts.light || "#ffffff",
      },
    });
  } catch (e) {
    console.warn("[QR] Failed to generate:", e.message);
    return "";
  }
}

export function buildQRPayload({
  receiptId,
  receiptNumber,
  date,
  customerName,
  grandTotal,
  currency = "INR",
  appName = "ReceiptAI",
}) {
  const parts = [
    `app:${appName}`,
    `id:${receiptId || ""}`,
    `no:${receiptNumber || ""}`,
    `date:${date || ""}`,
    `cust:${customerName || ""}`,
    `total:${currency} ${Number(grandTotal || 0).toFixed(2)}`,
  ];
  return parts.filter((p) => !p.endsWith(":")).join(" | ");
}

export default {
  generateQRDataURL,
  buildQRPayload,
};
