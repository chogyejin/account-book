export const TABS = [
  { id: 'expense', label: '💸 지출' },
  { id: 'income', label: '💰 Income' },
  { id: 'savings', label: '🏦 Savings' },
  { id: 'investment', label: '📈 Invest' },
] as const;

export type TabId = typeof TABS[number]['id'];
