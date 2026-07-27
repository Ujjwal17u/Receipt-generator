import Receipt from "../models/Receipt.js";
import { AppError } from "../middleware/errorHandler.js";
import {
  generateReceiptId,
  computeNextReceiptNumber,
} from "../utils/receipt-number.js";
import { computeReceiptTotals, round2 } from "../utils/gst-calc.js";
import { numberToWords } from "../utils/amount-to-words.js";
import { buildQRPayload } from "../utils/qr.js";
import { todayYYYYMMDD, startOfDay, endOfDay } from "../utils/date.js";
import config from "../config/index.js";

export const ReceiptNumberService = {
  async generateNext(forDate = new Date()) {
    const from = startOfDay(forDate);
    const to = endOfDay(forDate);
    const docs = await Receipt.find(
      { receiptDate: { $gte: from, $lte: to } },
      { receiptNumber: 1, _id: 0 },
    )
      .lean()
      .exec();
    const nums = docs.map((d) => d.receiptNumber);
    return computeNextReceiptNumber(nums, forDate);
  },
  async ensureUnique(desired, fallbackDate = new Date(), attempt = 0) {
    if (attempt > 5) {
      throw new AppError(
        "Failed to generate unique receipt number",
        500,
        "RECEIPT_NUMBER_CONFLICT",
      );
    }
    const exists = await Receipt.exists({ receiptNumber: desired }).exec();
    if (!exists) return desired;
    const docs = await Receipt.find(
      { receiptNumber: { $regex: `^REC-${todayYYYYMMDD(fallbackDate)}-` } },
      { receiptNumber: 1, _id: 0 },
    )
      .lean()
      .exec();
    const nums = docs.map((d) => d.receiptNumber).concat([desired]);
    return this.ensureUnique(
      computeNextReceiptNumber(nums, fallbackDate),
      fallbackDate,
      attempt + 1,
    );
  },
};

export const ReceiptService = {
  async _toReceiptShape(validBody) {
    const totals = computeReceiptTotals(validBody);
    const receiptDate = validBody.receiptDate ? new Date(validBody.receiptDate) : new Date();
    const currency = validBody.currency || "INR";
    const receiptId = validBody.receiptId || generateReceiptId();
    const receiptNumber =
      validBody.receiptNumber ||
      (await ReceiptNumberService.generateNext(receiptDate));

    const qrPayload = buildQRPayload({
      receiptId,
      receiptNumber,
      date: receiptDate.toISOString().slice(0, 10),
      customerName: validBody.customer?.name || "",
      grandTotal: totals.grandTotal,
      currency,
      appName: config.app.name,
    });

    const amountInWords = numberToWords(totals.grandTotal, currency);

    return {
      receiptId,
      receiptNumber: await ReceiptNumberService.ensureUnique(receiptNumber, receiptDate),
      receiptDate,
      customer: validBody.customer,
      items: totals.items,
      financials: {
        subtotal: totals.subtotal,
        gstEnabled: totals.gstEnabled,
        gstPercentage: totals.gstPercentage,
        gstAmount: totals.gstAmount,
        discount: totals.discount,
        shipping: totals.shipping,
        taxableAmount: totals.taxableAmount,
        grandTotal: totals.grandTotal,
        amountInWords,
        currency,
      },
      qrData: qrPayload,
      notes: validBody.notes || "",
      businessId: validBody.businessId || undefined,
    };
  },

  async create(validBody) {
    const shape = await this._toReceiptShape(validBody);
    const doc = new Receipt(shape);
    try {
      return await doc.save();
    } catch (e) {
      if (e.code === 11000 && e.keyPattern?.receiptNumber) {
        doc.receiptNumber = await ReceiptNumberService.ensureUnique(
          doc.receiptNumber,
          doc.receiptDate,
          1,
        );
        doc.isNew = true;
        return await doc.save();
      }
      throw e;
    }
  },

  async list(query) {
    const { page, limit, search, from, to, sort } = query;
    const filter = {};
    if (search) {
      filter.$or = [
        { receiptNumber: { $regex: search, $options: "i" } },
        { "customer.name": { $regex: search, $options: "i" } },
        { "customer.phone": { $regex: search, $options: "i" } },
        { "customer.email": { $regex: search, $options: "i" } },
      ];
    }
    if (from || to) {
      filter.receiptDate = {};
      if (from) filter.receiptDate.$gte = new Date(from);
      if (to) {
        const t = new Date(to);
        t.setHours(23, 59, 59, 999);
        filter.receiptDate.$lte = t;
      }
    }
    let sortSpec = { receiptDate: -1 };
    switch (sort) {
      case "oldest":
        sortSpec = { receiptDate: 1 };
        break;
      case "highest":
        sortSpec = { "financials.grandTotal": -1, receiptDate: -1 };
        break;
      case "lowest":
        sortSpec = { "financials.grandTotal": 1, receiptDate: -1 };
        break;
      default:
        sortSpec = { receiptDate: -1 };
    }
    const skip = (page - 1) * limit;
    const [items, count] = await Promise.all([
      Receipt.find(filter)
        .sort(sortSpec)
        .skip(skip)
        .limit(limit)
        .populate("businessId", "companyName email phone currency gstNumber logo address")
        .lean()
        .exec(),
      Receipt.countDocuments(filter).exec(),
    ]);
    const totals = await Receipt.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          revenue: { $sum: "$financials.grandTotal" },
          gstCollected: { $sum: "$financials.gstAmount" },
        },
      },
    ]).exec();
    const t = totals?.[0] || { revenue: 0, gstCollected: 0 };
    return {
      items,
      pagination: {
        page,
        limit,
        total: count,
        totalPages: Math.max(1, Math.ceil(count / limit)),
      },
      summary: {
        totalRevenue: round2(t.revenue || 0),
        totalGstCollected: round2(t.gstCollected || 0),
      },
    };
  },

  async getById(id) {
    const doc = await Receipt.findById(id)
      .populate("businessId")
      .lean()
      .exec();
    if (!doc) throw new AppError("Receipt not found", 404, "RECEIPT_NOT_FOUND");
    return doc;
  },

  async getByReceiptNumber(number) {
    const doc = await Receipt.findOne({ receiptNumber: number })
      .populate("businessId")
      .lean()
      .exec();
    if (!doc) throw new AppError("Receipt not found", 404, "RECEIPT_NOT_FOUND");
    return doc;
  },

  async update(id, validBody) {
    const doc = await Receipt.findById(id).exec();
    if (!doc) throw new AppError("Receipt not found", 404, "RECEIPT_NOT_FOUND");

    const currentShape = {
      customer: doc.customer.toObject(),
      items: doc.items.toObject(),
      gstEnabled: doc.financials.gstEnabled,
      gstPercentage: doc.financials.gstPercentage,
      discount: doc.financials.discount.toObject(),
      shipping: doc.financials.shipping,
      currency: doc.financials.currency,
      receiptDate: doc.receiptDate,
      receiptId: doc.receiptId,
      receiptNumber: doc.receiptNumber,
      notes: doc.notes,
      businessId: doc.businessId,
      ...validBody,
    };
    const nextShape = await this._toReceiptShape(currentShape);
    doc.overwrite(nextShape);
    doc._id = id;
    doc.$__.isNew = false;
    return await doc.save();
  },

  async remove(id) {
    const doc = await Receipt.findByIdAndDelete(id).exec();
    if (!doc) throw new AppError("Receipt not found", 404, "RECEIPT_NOT_FOUND");
    return doc;
  },
};

export default ReceiptService;
