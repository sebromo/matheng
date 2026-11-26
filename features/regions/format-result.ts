export function formatCalculationResult(value: number): string {
  return new Intl.NumberFormat("en-US", {
    maximumSignificantDigits: 10,
  }).format(value);
}
