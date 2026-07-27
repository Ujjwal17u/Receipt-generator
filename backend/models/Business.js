import mongoose from "mongoose";

const AddressSubSchema = new mongoose.Schema(
  {
    addressLine: { type: String, trim: true, maxLength: 200 },
    city: { type: String, trim: true, maxLength: 80 },
    state: { type: String, trim: true, maxLength: 80 },
    country: { type: String, trim: true, maxLength: 80 },
    postalCode: { type: String, trim: true, maxLength: 20 },
  },
  { _id: false },
);

const BusinessSchema = new mongoose.Schema(
  {
    companyName: {
      type: String,
      required: [true, "Company name is required"],
      trim: true,
      maxLength: [120, "Company name too long (max 120 chars)"],
      index: true,
    },
    ownerName: { type: String, trim: true, maxLength: 120, default: "" },
    logo: {
      type: String,
      trim: true,
      default: null,
      comment: "Base64 data URL or CDN URL",
    },
    phone: {
      type: String,
      required: [true, "Phone number is required"],
      trim: true,
      maxLength: 30,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      maxLength: 255,
      default: "",
    },
    website: { type: String, trim: true, maxLength: 255, default: "" },
    gstNumber: { type: String, trim: true, maxLength: 20, default: "" },
    currency: {
      type: String,
      trim: true,
      uppercase: true,
      default: "INR",
      enum: ["INR", "USD", "EUR", "GBP", "AED", "SAR"],
      maxLength: 5,
    },
    address: {
      type: AddressSubSchema,
      default: () => ({}),
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

BusinessSchema.index({ createdAt: -1 });
BusinessSchema.index({ email: 1 }, { sparse: true });

BusinessSchema.virtual("addressText").get(function () {
  const a = this.address || {};
  return [a.addressLine, a.city, a.state, a.country, a.postalCode]
    .filter(Boolean)
    .join(", ");
});

export const Business =
  mongoose.models.Business || mongoose.model("Business", BusinessSchema);

export default Business;
