const CURRENCY_SYMBOLS = {
  INR: "₹",
  USD: "$",
  EUR: "€",
  GBP: "£",
  AED: "د.إ",
  SAR: "ر.س",
};

export function currencySymbol(code = "INR") {
  return CURRENCY_SYMBOLS[String(code).toUpperCase()] || code;
}

export function formatCurrency(amount, currency = "INR", locale = "en-IN") {
  const n = Number(amount) || 0;
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: String(currency).toUpperCase(),
      maximumFractionDigits: 2,
      minimumFractionDigits: 2,
    }).format(n);
  } catch {
    return `${currencySymbol(currency)} ${n.toFixed(2)}`;
  }
}

export function formatNumber(amount, maxFraction = 2) {
  const n = Number(amount) || 0;
  return new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: maxFraction,
    minimumFractionDigits: maxFraction,
  }).format(n);
}

export default {
  currencySymbol,
  formatCurrency,
  formatNumber,
};
