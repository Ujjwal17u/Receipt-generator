const SMALL = [
  "Zero", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
  "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
  "Seventeen", "Eighteen", "Nineteen",
];

const TENS = [
  "", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety",
];

function belowHundred(n) {
  if (n < 20) return SMALL[n];
  const t = Math.floor(n / 10);
  const u = n % 10;
  return u === 0 ? TENS[t] : `${TENS[t]} ${SMALL[u]}`;
}

function belowThousand(n) {
  if (n < 100) return belowHundred(n);
  const h = Math.floor(n / 100);
  const rest = n % 100;
  let out = `${SMALL[h]} Hundred`;
  if (rest) out += ` ${belowHundred(rest)}`;
  return out;
}

function toEnglishIndian(n) {
  if (!Number.isFinite(n)) return "";
  const num = Math.abs(Math.floor(n));
  if (num === 0) return "Zero";

  const chunks = [];

  const crore = Math.floor(num / 10000000);
  if (crore) chunks.push(`${belowThousand(crore)} Crore`);
  const afterCrore = num % 10000000;

  const lakh = Math.floor(afterCrore / 100000);
  if (lakh) chunks.push(`${belowHundred(lakh)} Lakh`);
  const afterLakh = afterCrore % 100000;

  const thousand = Math.floor(afterLakh / 1000);
  if (thousand) chunks.push(`${belowHundred(thousand)} Thousand`);
  const afterThousand = afterLakh % 1000;

  if (afterThousand) chunks.push(belowThousand(afterThousand));

  return chunks.join(" ").trim();
}

function currencyWords(currency) {
  const c = String(currency || "INR").toUpperCase();
  switch (c) {
    case "USD":
      return { main: "Dollars", sub: "Cents" };
    case "EUR":
      return { main: "Euros", sub: "Cents" };
    case "GBP":
      return { main: "Pounds", sub: "Pence" };
    case "AED":
      return { main: "Dirhams", sub: "Fils" };
    case "SAR":
      return { main: "Riyals", sub: "Halalas" };
    case "INR":
    default:
      return { main: "Rupees", sub: "Paise" };
  }
}

export function numberToWords(amount, currency = "INR") {
  const negative = Number(amount) < 0 ? "Minus " : "";
  const absValue = Math.abs(Number(amount) || 0);
  const whole = Math.floor(absValue);
  const cents = Math.round((absValue - whole) * 100);
  const unit = currencyWords(currency);

  const parts = [];
  if (whole > 0) parts.push(`${toEnglishIndian(whole)} ${unit.main}`);
  if (cents > 0) parts.push(`${toEnglishIndian(cents)} ${unit.sub}`);
  if (parts.length === 0) parts.push(`Zero ${unit.main}`);
  parts.push("Only");

  return `${negative}${parts.join(" and ")}`;
}

export default numberToWords;
