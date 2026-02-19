import { NextResponse } from "next/server";

// ─── KR: 네이버 금융 ──────────────────────────────────────────────────────────

async function fetchKRPrice(assetId: string): Promise<number> {
  const url = `https://m.stock.naver.com/api/stock/${assetId}/basic`;
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15",
      Referer: "https://m.stock.naver.com/",
      Accept: "application/json",
    },
    cache: "no-store",
  });

  if (!res.ok) throw new Error(`네이버 금융 HTTP ${res.status}`);

  const data = await res.json();
  console.log("[KR price raw]", assetId, JSON.stringify(data).slice(0, 300));

  // 장 중에는 closePrice가 현재가, 장 마감 후에도 동일 필드 사용
  const raw: string =
    data.closePrice ?? data.currentPrice ?? data.stockPrice ?? "";
  const price = parseFloat(raw.replace(/,/g, ""));
  if (isNaN(price) || price === 0) throw new Error(`네이버: 시세 파싱 실패 (raw="${raw}")`);
  return price;
}

// ─── US: Yahoo Finance (crumb 인증) ───────────────────────────────────────────

let crumbCache: { crumb: string; cookie: string; expiresAt: number } | null = null;

async function getYahooCrumb(): Promise<{ crumb: string; cookie: string }> {
  if (crumbCache && Date.now() < crumbCache.expiresAt) {
    return crumbCache;
  }

  const cookieRes = await fetch("https://fc.yahoo.com", {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
    },
    redirect: "follow",
  });
  const cookie = cookieRes.headers.get("set-cookie") ?? "";
  console.log("[Yahoo cookie]", cookie.slice(0, 100));

  const crumbRes = await fetch(
    "https://query1.finance.yahoo.com/v1/test/getcrumb",
    {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
        Cookie: cookie,
      },
      cache: "no-store",
    },
  );
  const crumb = await crumbRes.text();
  console.log("[Yahoo crumb]", crumb);

  // crumb은 보통 11자 내외, 비어있거나 HTML이 오면 실패
  if (!crumb || crumb.startsWith("<") || crumb.length < 2) {
    throw new Error(`crumb 발급 실패: "${crumb.slice(0, 50)}"`);
  }

  crumbCache = { crumb, cookie, expiresAt: Date.now() + 30 * 60 * 1000 };
  return crumbCache;
}

async function fetchUSPrice(assetId: string): Promise<number> {
  const { crumb, cookie } = await getYahooCrumb();
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(assetId)}?interval=1d&range=1d&crumb=${encodeURIComponent(crumb)}`;

  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
      Cookie: cookie,
      Accept: "application/json",
    },
    cache: "no-store",
  });

  if (!res.ok) throw new Error(`Yahoo Finance HTTP ${res.status}`);

  const data = await res.json();
  console.log("[US price raw]", assetId, JSON.stringify(data).slice(0, 300));

  const price: number | undefined =
    data.chart?.result?.[0]?.meta?.regularMarketPrice;
  if (price == null) throw new Error("Yahoo: regularMarketPrice 없음");
  return price;
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const assetId = searchParams.get("assetId");
  const market = searchParams.get("market") ?? "KR";

  if (!assetId) {
    return NextResponse.json({ success: false, error: "assetId 필수" }, { status: 400 });
  }

  try {
    const price =
      market === "KR"
        ? await fetchKRPrice(assetId)
        : await fetchUSPrice(assetId);

    return NextResponse.json({ success: true, price });
  } catch (error) {
    console.error(`[price error] ${market}:${assetId}`, (error as Error).message);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 },
    );
  }
}
