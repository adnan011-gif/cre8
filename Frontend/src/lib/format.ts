export function formatCurrency(amount: number, currency = "INR"): string {
  try {
    const locale = currency === "INR" ? "en-IN" : "en-US";
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}
