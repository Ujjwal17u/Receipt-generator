import ReceiptService from "../services/ReceiptService.js";
import QRService from "../services/QRService.js";
import AmountToWordsService from "../services/AmountToWordsService.js";
import PDFService from "../services/PDFService.js";
import BusinessService from "../services/BusinessService.js";
import { formatCurrency } from "../utils/currency.js";
import { AppError } from "../middleware/errorHandler.js";

const send = (res, data, message = "Success", status = 200) =>
  res.status(status).json({ success: true, message, data });

export const ReceiptController = {
  async create(req, res, next) {
    try {
      const body = req.validBody || req.body;
      const doc = await ReceiptService.create(body);
      send(res, doc, "Receipt created successfully", 201);
    } catch (e) {
      next(e);
    }
  },

  async list(req, res, next) {
    try {
      const query = req.validQuery || {
        page: Number(req.query.page) || 1,
        limit: Number(req.query.limit) || 25,
        search: req.query.search || "",
        from: req.query.from,
        to: req.query.to,
        sort: req.query.sort || "newest",
      };
      const data = await ReceiptService.list(query);
      send(res, data, "Receipts retrieved");
    } catch (e) {
      next(e);
    }
  },

  async get(req, res, next) {
    try {
      const id = req.params.id;
      if (!id) throw new AppError("Receipt ID is required", 400, "BAD_REQUEST");
      const doc = /^REC-/.test(String(id))
        ? await ReceiptService.getByReceiptNumber(id)
        : await ReceiptService.getById(id);
      send(res, doc, "Receipt retrieved");
    } catch (e) {
      next(e);
    }
  },

  async update(req, res, next) {
    try {
      const id = req.params.id;
      const body = req.validBody || req.body;
      const doc = await ReceiptService.update(id, body);
      send(res, doc, "Receipt updated");
    } catch (e) {
      next(e);
    }
  },

  async remove(req, res, next) {
    try {
      const id = req.params.id;
      await ReceiptService.remove(id);
      send(res, null, "Receipt deleted");
    } catch (e) {
      next(e);
    }
  },

  async utilsAmountToWords(req, res, next) {
    try {
      const amount = Number(req.query.amount || req.body.amount);
      const currency = String(req.query.currency || req.body.currency || "INR");
      if (!Number.isFinite(amount)) {
        throw new AppError("Valid numeric amount is required", 400, "BAD_AMOUNT");
      }
      const words = AmountToWordsService.convert(amount, currency);
      const formatted = formatCurrency(amount, currency);
      send(res, { amount, currency, formatted, words });
    } catch (e) {
      next(e);
    }
  },

  async utilsQR(req, res, next) {
    try {
      const { payload, text, width } = req.query;
      const t = payload || text || "";
      if (!t) throw new AppError("payload/text is required", 400, "BAD_REQUEST");
      const dataURL = await QRService.dataURL(String(t), {
        width: Number(width) || 256,
      });
      send(res, { text: String(t), dataURL });
    } catch (e) {
      next(e);
    }
  },

  async preview(req, res, next) {
    try {
      const id = req.params.id;
      const doc = /^REC-/.test(String(id))
        ? await ReceiptService.getByReceiptNumber(id)
        : await ReceiptService.getById(id);
      const business = doc.businessId || (await BusinessService.getFirst());
      const html = await PDFService.renderForReceipt(doc, business);
      res.type("html").send(html);
    } catch (e) {
      next(e);
    }
  },

  async nextNumber(_req, res, next) {
    try {
      const ReceiptNumberService = (await import("../services/ReceiptService.js"))
        .ReceiptNumberService;
      const number = await ReceiptNumberService.generateNext(new Date());
      send(res, { receiptNumber: number, date: new Date().toISOString().slice(0, 10) });
    } catch (e) {
      next(e);
    }
  },
};

export default ReceiptController;
