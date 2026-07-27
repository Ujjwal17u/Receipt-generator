import { v4 as uuidv4 } from "uuid";
import { todayYYYYMMDD } from "./date.js";

export function generateReceiptId() {
  return `rec_${uuidv4().replace(/-/g, "").slice(0, 18)}`;
}

function prefixForDate(dateStr) {
  return `REC-${dateStr}-`;
}

export function computeNextReceiptNumber(existingNumbersForDay = [], date = new Date()) {
  const dateStr = todayYYYYMMDD(date);
  const prefix = prefixForDate(dateStr);
  const regex = new RegExp(`^${prefix}(\\d+)$`, "i");

  let maxSeq = 0;
  for (const n of existingNumbersForDay) {
    const m = String(n || "").match(regex);
    if (m) {
      const seq = parseInt(m[1], 10);
      if (Number.isFinite(seq) && seq > maxSeq) maxSeq = seq;
    }
  }
  const next = maxSeq + 1;
  return `${prefix}${String(next).padStart(4, "0")}`;
}

export function isReceiptNumberFormatValid(num) {
  return /^REC-\d{8}-\d{4}$/.test(String(num || ""));
}

export default {
  generateReceiptId,
  computeNextReceiptNumber,
  isReceiptNumberFormatValid,
};
