import { generateQRDataURL, buildQRPayload } from "../utils/qr.js";
import config from "../config/index.js";

export const QRService = {
  async forReceipt(receipt) {
    const payload = buildQRPayload({
      receiptId: receipt?.receiptId,
      receiptNumber: receipt?.receiptNumber,
      date: receipt?.receiptDate ? new Date(receipt.receiptDate).toISOString().slice(0, 10) : "",
      customerName: receipt?.customer?.name || "",
      grandTotal: receipt?.financials?.grandTotal,
      currency: receipt?.financials?.currency || "INR",
      appName: config.app.name,
    });
    const dataURL = await generateQRDataURL(payload, { width: 256 });
    return { payload, dataURL };
  },

  async dataURL(text, opts = {}) {
    return generateQRDataURL(text, opts);
  },
};

export default QRService;
