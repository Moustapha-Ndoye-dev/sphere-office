export function formatPrice(price: number) {
  const formattedAmount = new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })
    .format(price)
    .replace(/\u202f|\u00a0/g, ' ');

  return `${formattedAmount} FCFA`;
}
