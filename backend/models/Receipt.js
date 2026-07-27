import mongoose from "mongoose";

const CustomerSubSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Customer name is required"],
      trim: true,
      maxLength: 120,
    },
    phone: { type: String, trim: true, maxLength: 30, default: "" },
    email: { type: String, trim: true, lowercase: true, maxLength: 255, default: "" },
    address: { type: String, trim: true, maxLength: 300, default: "" },
  },
  { _id: false },
);

const ReceiptItemSubSchema = new mongoose.Schema(
  {
    itemName: {
      type: String,
      required: [true, "Item name is required"],
      trim: true,
      maxLength: 200,
    },
    description: { type: String, trim: true, maxLength: 500, default: "" },
    quantity: {
      type: Number,
      required: [true, "Quantity is required"],
      min: [0.00001, "Quantity must be greater than 0"],
    },
    unitPrice: {
      type: Number,
      required: [true, "Unit price is required"],
      min: [0, "Unit price must be >= 0"],
    },
    total: {
      type: Number,
      required: true,
      min: [0, "Item total must be >= 0"],
    },
  },
  { _id: false },
);

const FinancialsSubSchema = new mongoose.Schema(
  {
    subtotal: {
      type: Number,
      required: true,
      min: [0, "Subtotal must be >= 0"],
    },
    gstEnabled: { type: Boolean, default: false },
    gstPercentage: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
    gstAmount: {
      type: Number,
      required: true,
      min: [0, "GST amount must be >= 0"],
      default: 0,
    },
    discount: {
      percentage: { type: Number, min: 0, max: 100, default: 0 },
      amount: { type: Number, min: 0, default: 0 },
    },
    shipping: { type: Number, min: 0, default: 0 },
    taxableAmount: {
      type: Number,
      required: true,
      min: [0, "Taxable amount must be >= 0"],
    },
    grandTotal: {
      type: Number,
      required: true,
      min: [0, "Grand total must be >= 0"],
    },
    amountInWords: { type: String, trim: true, maxLength: 500, default: "" },
    currency: {
      type: String,
      trim: true,
      uppercase: true,
      default: "INR",
      enum: ["INR", "USD", "EUR", "GBP", "AED", "SAR"],
    },
  },
  { _id: false },
);

const ReceiptSchema = new mongoose.Schema(
  {
    receiptId: {
      type: String,
      unique: true,
      required: true,
      trim: true,
      maxLength: 50,
    },
    receiptNumber: {
      type: String,
      unique: true,
      required: true,
      trim: true,
      maxLength: 40,
    },
    receiptDate: {
      type: Date,
      required: true,
      default: Date.now,
      index: true,
    },

    customer: {
      type: CustomerSubSchema,
      required: true,
    },

    items: {
      type: [ReceiptItemSubSchema],
      required: [true, "At least one item is required"],
      validate: {
        validator: (v) => Array.isArray(v) && v.length > 0,
        message: "At least one item is required",
      },
    },

    financials: {
      type: FinancialsSubSchema,
      required: true,
    },

    qrData: { type: String, trim: true, maxLength: 1000, default: "" },
    notes: { type: String, trim: true, maxLength: 1000, default: "" },

    businessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Business",
      default: null,
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

ReceiptSchema.index({ receiptNumber: 1 }, { unique: true });
ReceiptSchema.index({ receiptDate: -1 });
ReceiptSchema.index({ "customer.name": "text", receiptNumber: "text" });

ReceiptSchema.pre("save", function (next) {
  if (this.items && this.items.length > 0) {
    for (const it of this.items) {
      if (!it.total || it.total === 0) {
        it.total = (Number(it.quantity) || 0) * (Number(it.unitPrice) || 0);
      }
    }
  }
  next();
});

export const Receipt =
  mongoose.models.Receipt || mongoose.model("Receipt", ReceiptSchema);

export default Receipt;
