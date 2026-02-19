import type { InvestmentTransaction } from "./sheets-api";

export interface AssetHolding {
  assetId: string;
  assetName: string;
  currency: string;
  totalQuantity: number;
  totalInvested: number;        // KRW 환산 (현재 보유 원가)
  avgPrice: number;             // 원본 통화
  minBuyPrice: number;
  maxBuyPrice: number;
  currentPrice: number;
  currentValue: number;         // KRW 환산
  currentValueOriginal: number;
  profit: number;               // KRW (미실현)
  profitRate: number;           // %
}

export interface PortfolioSummary {
  totalValueKRW: number;        // 보유주식 현재 평가액
  totalPortfolioKRW: number;    // 보유주식 + 현금 잔고
  totalInvestedKRW: number;     // 총 매수금액 (수익률 분모)
  realizedProfit: number;       // 실현손익 (KRW)
  unrealizedProfit: number;     // 미실현손익 (KRW)
  totalProfit: number;          // 실현 + 미실현
  totalProfitRate: number;      // %
  cashKRW: number;              // 현금 잔고 (KRW 환산 합계)
  cashUSD: number;              // USD 현금 잔고 (원본)
  currencyRatio: {
    KRW: { amount: number; percentage: number };
    USD: { amount: number; percentage: number };
  };
  holdings: AssetHolding[];
  exchangeRate: number;
}

function toKRW(amount: number, currency: string, exchangeRate: number): number {
  return currency === "USD" ? amount * exchangeRate : amount;
}

export function calculatePortfolio(
  transactions: InvestmentTransaction[],
  currentPrices: Record<string, number>,
  exchangeRate: number,
): PortfolioSummary {
  // 평균단가법 실현손익 계산을 위해 날짜순 정렬
  const sorted = [...transactions].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );

  interface AssetState {
    assetId: string;
    assetName: string;
    currency: string;
    qty: number;
    cost: number;           // 현재 보유분 원가 (원본 통화)
    realizedProfit: number; // 실현손익 (원본 통화)
    buyPrices: number[];
  }

  const assetMap = new Map<string, AssetState>();
  let cashKRW = 0;
  let cashUSD = 0;
  let totalBuyAmountKRW = 0;

  for (const t of sorted) {
    const amount = Number(t.amount) || 0;
    const qty = Number(t.quantity) || 0;
    const currency = t.currency || "KRW";
    const isUSD = currency === "USD";

    // 현금 입출금
    if (t.type === "입금") {
      isUSD ? (cashUSD += amount) : (cashKRW += amount);
      continue;
    }
    if (t.type === "출금") {
      isUSD ? (cashUSD -= amount) : (cashKRW -= amount);
      continue;
    }

    if (!t.assetId) continue;

    if (!assetMap.has(t.assetId)) {
      assetMap.set(t.assetId, {
        assetId: t.assetId,
        assetName: t.assetName,
        currency,
        qty: 0,
        cost: 0,
        realizedProfit: 0,
        buyPrices: [],
      });
    }

    const state = assetMap.get(t.assetId)!;

    if (t.type === "매수") {
      state.cost += amount;
      state.qty += qty;
      if (qty > 0) state.buyPrices.push(amount / qty);
      isUSD ? (cashUSD -= amount) : (cashKRW -= amount);
      totalBuyAmountKRW += toKRW(amount, currency, exchangeRate);
    } else if (t.type === "매도") {
      // 평균단가법: 매도 시점의 평균단가로 실현손익 계산
      const avgCost = state.qty > 0 ? state.cost / state.qty : 0;
      const costBasis = avgCost * qty;
      state.realizedProfit += amount - costBasis;
      state.cost = Math.max(0, state.cost - costBasis);
      state.qty = Math.max(0, state.qty - qty);
      isUSD ? (cashUSD += amount) : (cashKRW += amount);
    }
  }

  // 보유 종목 계산
  const holdings: AssetHolding[] = [];

  for (const state of assetMap.values()) {
    if (state.qty <= 0) continue;

    const avgPrice = state.qty > 0 ? state.cost / state.qty : 0;
    const minBuyPrice = state.buyPrices.length > 0 ? Math.min(...state.buyPrices) : 0;
    const maxBuyPrice = state.buyPrices.length > 0 ? Math.max(...state.buyPrices) : 0;

    const currentPrice = currentPrices[state.assetId] ?? 0;
    const currentValueOriginal = currentPrice * state.qty;
    const currentValue = toKRW(currentValueOriginal, state.currency, exchangeRate);

    const totalInvested = toKRW(state.cost, state.currency, exchangeRate);
    const profit = currentValue - totalInvested;
    const profitRate = totalInvested > 0 ? (profit / totalInvested) * 100 : 0;

    holdings.push({
      assetId: state.assetId,
      assetName: state.assetName,
      currency: state.currency,
      totalQuantity: state.qty,
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

  holdings.sort((a, b) => b.currentValue - a.currentValue);

  const totalValueKRW = holdings.reduce((s, h) => s + h.currentValue, 0);
  const unrealizedProfit = holdings.reduce((s, h) => s + h.profit, 0);

  const realizedProfit = [...assetMap.values()].reduce(
    (s, state) => s + toKRW(state.realizedProfit, state.currency, exchangeRate),
    0,
  );

  const totalProfit = realizedProfit + unrealizedProfit;
  const totalProfitRate =
    totalBuyAmountKRW > 0 ? (totalProfit / totalBuyAmountKRW) * 100 : 0;

  const cashKRWTotal = cashKRW + cashUSD * exchangeRate;
  const totalPortfolioKRW = totalValueKRW + cashKRWTotal;

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
    totalPortfolioKRW,
    totalInvestedKRW: totalBuyAmountKRW,
    realizedProfit,
    unrealizedProfit,
    totalProfit,
    totalProfitRate,
    cashKRW: cashKRWTotal,
    cashUSD,
    currencyRatio: {
      KRW: { amount: krwValue, percentage: krwPct },
      USD: { amount: usdValue, percentage: usdPct },
    },
    holdings,
    exchangeRate,
  };
}
