const exchangeRates = {
  EUR: 1,
  USD: 1.08,
  GBP: 0.85,
};

export function convertPrice(price: number, fromCurrency: string, toCurrency: string): number {
  const rateFrom = exchangeRates[fromCurrency as keyof typeof exchangeRates];
  const rateTo = exchangeRates[toCurrency as keyof typeof exchangeRates];
  return (price / rateFrom) * rateTo;
}

export function formatCurrency(price: number, currency: string): string {
  return new Intl.NumberFormat(currency === 'EUR' ? 'fr-FR' : currency === 'GBP' ? 'en-GB' : 'en-US', {
    style: 'currency',
    currency,
  }).format(price);
}