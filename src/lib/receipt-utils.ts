const ones = [
  "",
  "One",
  "Two",
  "Three",
  "Four",
  "Five",
  "Six",
  "Seven",
  "Eight",
  "Nine",
  "Ten",
  "Eleven",
  "Twelve",
  "Thirteen",
  "Fourteen",
  "Fifteen",
  "Sixteen",
  "Seventeen",
  "Eighteen",
  "Nineteen",
];

const tens = [
  "",
  "",
  "Twenty",
  "Thirty",
  "Forty",
  "Fifty",
  "Sixty",
  "Seventy",
  "Eighty",
  "Ninety",
];

function convertHundreds(num: number): string {
  let result = "";
  if (num >= 100) {
    result += ones[Math.floor(num / 100)] + " Hundred";
    num %= 100;
    if (num > 0) result += " ";
  }
  if (num >= 20) {
    result += tens[Math.floor(num / 10)];
    num %= 10;
    if (num > 0) result += " " + ones[num];
  } else if (num > 0) {
    result += ones[num];
  }
  return result;
}

export function numberToWords(num: number, currency = "INR"): string {
  if (num === 0) return "Zero Rupees Only";

  const whole = Math.floor(num);
  const paise = Math.round((num - whole) * 100);

  const currencyName =
    currency === "USD"
      ? "Dollars"
      : currency === "EUR"
      ? "Euros"
      : currency === "GBP"
      ? "Pounds"
      : currency === "AED"
      ? "Dirhams"
      : currency === "SAR"
      ? "Riyals"
      : "Rupees";

  const fractionName =
    currency === "USD" || currency === "EUR" || currency === "GBP"
      ? "Cents"
      : "Paise";

  if (whole === 0 && paise > 0) {
    if (paise < 20) {
      return ones[paise] + " " + fractionName + " Only";
    }
    const t = tens[Math.floor(paise / 10)];
    const o = ones[paise % 10];
    return (t + (o ? " " + o : "") + " " + fractionName + " Only").trim();
  }

  let words = "";

  const crores = Math.floor(whole / 10000000);
  let remaining = whole % 10000000;

  if (crores > 0) {
    words += convertHundreds(crores) + " Crore ";
  }

  const lakhs = Math.floor(remaining / 100000);
  remaining %= 100000;

  if (lakhs > 0) {
    words += convertHundreds(lakhs) + " Lakh ";
  }

  const thousands = Math.floor(remaining / 1000);
  remaining %= 1000;

  if (thousands > 0) {
    words += convertHundreds(thousands) + " Thousand ";
  }

  const hundreds = remaining;
  if (hundreds > 0) {
    words += convertHundreds(hundreds);
  }

  words = words.trim() + " " + currencyName;

  if (paise > 0) {
    let paiseWords = "";
    if (paise < 20) {
      paiseWords = ones[paise];
    } else {
      const t = tens[Math.floor(paise / 10)];
      const o = ones[paise % 10];
      paiseWords = (t + (o ? " " + o : "")).trim();
    }
    words += " and " + paiseWords + " " + fractionName;
  }

  words += " Only";
  return words.trim();
}

export function formatCurrency(amount: number, currency = "INR"): string {
  const symbols: Record<string, string> = {
    INR: "₹",
    USD: "$",
    EUR: "€",
    GBP: "£",
    AED: "د.إ",
    SAR: "﷼",
  };
  const symbol = symbols[currency] || "₹";
  return symbol + amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function formatDate(date: Date): string {
  return date.toLocaleDateString("en-IN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

export function formatDateTime(date: Date): string {
  return date.toLocaleDateString("en-IN", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }) +
    " · " +
    date.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
    });
}

export function generateReceiptNumber(todayCount: number, date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const seq = String(todayCount + 1).padStart(4, "0");
  return `REC-${y}${m}${d}-${seq}`;
}

export function isSameDay(d1: Date, d2: Date): boolean {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}
