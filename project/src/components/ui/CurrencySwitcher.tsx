import React from 'react';
import { useCurrencyStore } from '../../store/currency';

export function CurrencySwitcher() {
  const { currency, setCurrency } = useCurrencyStore();
  const currencies = ['EUR', 'USD', 'GBP'] as const;

  return (
    <select
      value={currency}
      onChange={(e) => setCurrency(e.target.value as typeof currencies[number])}
      className="p-2 text-sm border-none bg-transparent text-gray-700 hover:text-primary-600 dark:text-gray-300 dark:hover:text-primary-400 focus:ring-0"
    >
      {currencies.map((curr) => (
        <option key={curr} value={curr}>
          {curr}
        </option>
      ))}
    </select>
  );
}