export type PosPaymentMethod = 'cash' | 'wave' | 'orange_money' | 'card' | 'bank_transfer';

export type PosPaymentStatus = 'unpaid' | 'partial' | 'paid';

export function calculatePosPayment(
  total: number,
  amountInput: string,
  paymentMethod: PosPaymentMethod
) {
  const safeTotal = Number.isFinite(total) ? Math.max(total, 0) : 0;
  const requestedAmount = amountInput.trim() === '' ? safeTotal : Number(amountInput);
  const isValid = Number.isFinite(requestedAmount) && requestedAmount >= 0;
  const amountReceived = isValid ? requestedAmount : 0;
  const amountPaid = Math.min(amountReceived, safeTotal);
  const balanceDue = Math.max(safeTotal - amountPaid, 0);
  const changeDue = paymentMethod === 'cash' ? Math.max(amountReceived - safeTotal, 0) : 0;
  const paymentStatus: PosPaymentStatus = safeTotal <= 0 || amountPaid <= 0
    ? 'unpaid'
    : amountPaid < safeTotal
      ? 'partial'
      : 'paid';

  return {
    requestedAmount,
    isValid,
    amountReceived,
    amountPaid,
    balanceDue,
    changeDue,
    paymentStatus,
  };
}
