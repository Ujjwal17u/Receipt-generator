export function round2(n) {
  return Math.round((Number(n) || 0) * 100) / 100;
}

export function calculateLineTotal(qty, unitPrice) {
  return round2((Number(qty) || 0) * (Number(unitPrice) || 0));
}

export function computeReceiptTotals(input) {
  const items = Array.isArray(input?.items) ? input.items : [];
  const gstEnabled = Boolean(input?.gstEnabled ?? false);
  const gstPercentage = Number(input?.gstPercentage) || 0;
  const discountPct = Math.min(
    100,
    Math.max(0, Number(input?.discount?.percentage) || Number(input?.discountPercentage) || 0),
  );
  const shippingFee = Math.max(0, Number(input?.shipping) || 0);

  const itemsWithTotal = items.map((it) => {
    const qty = Number(it.quantity) || 0;
    const price = Number(it.unitPrice) || 0;
    const total = round2(qty * price);
    return { ...it, quantity: qty, unitPrice: price, total };
  });

  const subtotal = round2(itemsWithTotal.reduce((sum, it) => sum + it.total, 0));

  const discountAmount = round2(subtotal * (discountPct / 100));
  const taxableAmount = round2(Math.max(0, subtotal - discountAmount) + shippingFee);
  const gstAmount = gstEnabled ? round2(taxableAmount * (gstPercentage / 100)) : 0;
  const grandTotal = round2(taxableAmount + gstAmount);

  return {
    items: itemsWithTotal,
    subtotal,
    gstEnabled,
    gstPercentage: gstEnabled ? gstPercentage : 0,
    gstAmount,
    discount: {
      percentage: discountPct,
      amount: discountAmount,
    },
    shipping: shippingFee,
    taxableAmount,
    grandTotal,
  };
}

export function computeGSTAmount(taxable, percent) {
  return round2((Number(taxable) || 0) * (Math.max(0, Number(percent) || 0) / 100));
}

export default {
  round2,
  calculateLineTotal,
  computeReceiptTotals,
  computeGSTAmount,
};
