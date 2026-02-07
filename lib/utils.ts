export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '-';
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

export function formatAmount(amount: number | string | null | undefined): string {
  if (!amount && amount !== 0) return '0원';
  return Math.round(Number(amount)).toLocaleString('ko-KR') + '원';
}

export function formatCurrency(amount: number | string | null | undefined, currency: string): string {
  if (!amount && amount !== 0) return '-';
  const formatted = Math.round(Number(amount)).toLocaleString('ko-KR');
  switch (currency) {
    case 'USD': return '$' + formatted;
    case 'EUR': return '€' + formatted;
    default: return formatted + '원';
  }
}

export function getTodayString(): string {
  return new Date().toISOString().split('T')[0];
}

export function generateId(prefix: string): string {
  return prefix + '_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}
