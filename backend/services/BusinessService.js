import Business from "../models/Business.js";
import config from "../config/index.js";
import { AppError } from "../middleware/errorHandler.js";

function normalizeInput(data) {
  const out = { ...data };
  if (out.email) out.email = String(out.email).trim().toLowerCase();
  if (out.currency) out.currency = String(out.currency).toUpperCase();
  if (out.address && typeof out.address === "object") {
    const a = { ...out.address };
    for (const k of ["addressLine", "city", "state", "country", "postalCode"]) {
      a[k] = a[k] || "";
    }
    out.address = a;
  }
  return out;
}

export const BusinessService = {
  async create(data) {
    const payload = normalizeInput(data);
    const business = new Business(payload);
    return await business.save();
  },

  async getOrCreateDefault(fallback = {}) {
    const docs = await Business.find().sort({ createdAt: 1 }).limit(1).lean().exec();
    if (docs && docs[0]) return docs[0];
    const defaults = {
      companyName: fallback.companyName || config.app.name,
      ownerName: fallback.ownerName || "",
      phone: fallback.phone || "+91-00000-00000",
      email: fallback.email || "",
      website: "",
      gstNumber: "",
      currency: fallback.currency || "INR",
      logo: fallback.logo || null,
      address: {
        addressLine: fallback.address?.addressLine || "",
        city: fallback.address?.city || "",
        state: fallback.address?.state || "",
        country: fallback.address?.country || "India",
        postalCode: fallback.address?.postalCode || "",
      },
    };
    try {
      return await this.create(defaults);
    } catch (e) {
      if (e.code === 11000) {
        return (await Business.findOne().lean().exec()) || defaults;
      }
      throw e;
    }
  },

  async list() {
    return await Business.find().sort({ updatedAt: -1 }).lean().exec();
  },

  async getById(id) {
    const doc = await Business.findById(id).lean().exec();
    if (!doc) throw new AppError("Business not found", 404, "BUSINESS_NOT_FOUND");
    return doc;
  },

  async getFirst() {
    return (await Business.find().sort({ createdAt: 1 }).limit(1).lean().exec())?.[0] || null;
  },

  async update(idOrFilter, data) {
    const payload = normalizeInput(data);
    let doc;
    if (typeof idOrFilter === "object") {
      doc = await Business.findOne(idOrFilter).exec();
    } else {
      doc = await Business.findById(idOrFilter).exec();
    }
    if (!doc) throw new AppError("Business not found", 404, "BUSINESS_NOT_FOUND");

    for (const [key, value] of Object.entries(payload)) {
      if (key === "address" && typeof value === "object") {
        doc.address = { ...(doc.address?.toObject?.() || doc.address || {}), ...value };
      } else if (value !== undefined) {
        doc[key] = value;
      }
    }
    return await doc.save();
  },

  async updateFirst(data) {
    let doc = await Business.findOne().sort({ createdAt: 1 }).exec();
    if (!doc) {
      return await this.create(data);
    }
    return await this.update(doc._id, data);
  },

  async remove(id) {
    const doc = await Business.findByIdAndDelete(id).exec();
    if (!doc) throw new AppError("Business not found", 404, "BUSINESS_NOT_FOUND");
    return doc;
  },
};

export default BusinessService;
