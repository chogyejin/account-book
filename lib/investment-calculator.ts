import type { InvestmentTransaction } from "./sheets-api";

export interface AssetHolding {
  assetId: string;
  assetName: string;
  currency: string;
  totalQuantity: number;
  totalInvested: number;       // KRW 환산
  avgPrice: number;            // 원본 통화
  minBuyPrice: number;
  maxBuyPrice: number;
  currentPrice: number;        // 사용자 입력 (원본 통화)
  currentValue: number;        // KRW 환산
  currentValueOriginal: number;
  profit: number;              // KRW
  profitRate: number;          // %
}

export interface PortfolioSummary {
  totalValueKRW: number;
  totalInvestedKRW: number;
  totalProfit: number;
  totalProfitRate: number;
  currencyRatio: {
    KRW: { amount: number; percentage: number };
    USD: { amount: number; percentage: number };
  };
  holdings: AssetHolding[];
  exchangeRate: number;
}

function toKRW(amount: number, currency: string, exchangeRate: number): number {
  if (currency === "USD") return amount * exchangeRate;
  return amount;
}

export function calculatePortfolio(
  transactions: InvestmentTransaction[],
  currentPrices: Record<string, number>,
  exchangeRate: number,
): PortfolioSummary {
  // Group transactions by assetId
  const assetMap = new Map<
    string,
    {
      assetId: string;
      assetName: string;
      currency: string;
      buyQty: number;
      sellQty: number;
      totalCost: number;    // sum of (quantity * pricePerUnit) in original currency
      buyPrices: number[];  // pricePerUnit for each buy transaction
    }
  >();

  for (const t of transactions) {
    if (!t.assetId) continue;
    const qty = Number(t.quantity) || 0;
    const amount = Number(t.amount) || 0;

    if (!assetMap.has(t.assetId)) {
      assetMap.set(t.assetId, {
        assetId: t.assetId,
        assetName: t.assetName,
        currency: t.currency || "KRW",
        buyQty: 0,
        sellQty: 0,
        totalCost: 0,
        buyPrices: [],
      });
    }

    const entry = assetMap.get(t.assetId)!;

    if (t.type === "매수") {
      entry.buyQty += qty;
      entry.totalCost += amount;
      if (qty > 0) {
        entry.buyPrices.push(amount / qty);
      }
    } else if (t.type === "매도") {
      entry.sellQty += qty;
    }
  }

  const holdings: AssetHolding[] = [];

  for (const entry of assetMap.values()) {
    const totalQuantity = entry.buyQty - entry.sellQty;
    if (totalQuantity <= 0) continue;

    const avgPrice = entry.buyQty > 0 ? entry.totalCost / entry.buyQty : 0;
    const minBuyPrice =
      entry.buyPrices.length > 0 ? Math.min(...entry.buyPrices) : 0;
    const maxBuyPrice =
      entry.buyPrices.length > 0 ? Math.max(...entry.buyPrices) : 0;

    const currentPrice = currentPrices[entry.assetId] ?? 0;
    const currentValueOriginal = currentPrice * totalQuantity;
    const currentValue = toKRW(currentValueOriginal, entry.currency, exchangeRate);

    // totalInvested: cost of currently held shares in KRW
    const heldCostOriginal = avgPrice * totalQuantity;
    const totalInvested = toKRW(heldCostOriginal, entry.currency, exchangeRate);

    const profit = currentValue - totalInvested;
    const profitRate = totalInvested > 0 ? (profit / totalInvested) * 100 : 0;

    holdings.push({
      assetId: entry.assetId,
      assetName: entry.assetName,
      currency: entry.currency,
      totalQuantity,
      totalInvested,
      avgPrice,
      minBuyPrice,
      maxBuyPrice,
      currentPrice,
      currentValue,
      currentValueOriginal,
      profit,
      profitRate,
    });
  }

  // Sort by currentValue descending
  holdings.sort((a, b) => b.currentValue - a.currentValue);

  const totalValueKRW = holdings.reduce((s, h) => s + h.currentValue, 0);
  const totalInvestedKRW = holdings.reduce((s, h) => s + h.totalInvested, 0);
  const totalProfit = totalValueKRW - totalInvestedKRW;
  const totalProfitRate =
    totalInvestedKRW > 0 ? (totalProfit / totalInvestedKRW) * 100 : 0;

  const krwValue = holdings
    .filter((h) => h.currency === "KRW")
    .reduce((s, h) => s + h.currentValue, 0);
  const usdValue = holdings
    .filter((h) => h.currency === "USD")
    .reduce((s, h) => s + h.currentValue, 0);

  const krwPct = totalValueKRW > 0 ? (krwValue / totalValueKRW) * 100 : 0;
  const usdPct = totalValueKRW > 0 ? (usdValue / totalValueKRW) * 100 : 0;

  return {
    totalValueKRW,
    totalInvestedKRW,
    totalProfit,
    totalProfitRate,
    currencyRatio: {
      KRW: { amount: krwValue, percentage: krwPct },
      USD: { amount: usdValue, percentage: usdPct },
    },
    holdings,
    exchangeRate,
  };
}
