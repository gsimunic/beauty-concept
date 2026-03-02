export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("hr-HR", {
    style: "currency",
    currency: "EUR"
  }).format(amount);
}
