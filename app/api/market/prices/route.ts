import { NextResponse } from "next/server";
import { getGoogleSheetsClient, SPREADSHEET_ID } from "@/lib/google-sheets-client";

const PRICES_SHEET = "_prices";

// KR: KRX:{code}, US: 티커 그대로
function toGoogleFinanceSymbol(assetId: string, market: string) {
  return market === "KR" ? `KRX:${assetId}` : assetId;
}

async function ensureSheet(sheets: ReturnType<typeof getGoogleSheetsClient>) {
  const meta = await sheets.spreadsheets.get({
    spreadsheetId: SPREADSHEET_ID,
    fields: "sheets.properties.title",
  });
  const titles = meta.data.sheets?.map((s) => s.properties?.title ?? "") ?? [];
  if (!titles.includes(PRICES_SHEET)) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      requestBody: {
        requests: [{ addSheet: { properties: { title: PRICES_SHEET } } }],
      },
    });
  }
}

export async function POST(request: Request) {
  const assets: Array<{ assetId: string; market: string }> = await request.json();
  if (!assets.length) {
    return NextResponse.json({ success: true, prices: {} });
  }

  try {
    const sheets = getGoogleSheetsClient();
    await ensureSheet(sheets);

    // 이미 등록된 종목 확인 (A열: assetId)
    const existingRes = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${PRICES_SHEET}!A:A`,
    });
    const existingIds = new Set(
      (existingRes.data.values ?? []).flat().map(String),
    );

    // 새 종목만 수식 추가
    const newAssets = assets.filter((a) => !existingIds.has(String(a.assetId)));
    if (newAssets.length > 0) {
      const rows = newAssets.map(({ assetId, market }) => [
        "'" + String(assetId),
        `=GOOGLEFINANCE("${toGoogleFinanceSymbol(String(assetId), market)}","price")`,
      ]);
      await sheets.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID,
        range: `${PRICES_SHEET}!A:B`,
        valueInputOption: "USER_ENTERED",
        requestBody: { values: rows },
      });
    }

    // 모든 종목의 계산된 현재가 읽기
    // FORMATTED_VALUE로 읽어야 #N/A 같은 수식 오류 문자열을 감지할 수 있음
    const allRes = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${PRICES_SHEET}!A:B`,
      valueRenderOption: "FORMATTED_VALUE",
    });

    const prices: Record<string, number> = {};
    const errors: string[] = []; // 수식 오류 종목 assetId 목록

    for (const row of allRes.data.values ?? []) {
      const id = String(row[0] ?? "").trim();
      if (!id) continue;

      const raw = String(row[1] ?? "").trim();

      // #N/A, #ERROR!, #REF! 등 수식 오류 or 아직 미계산(빈 값)
      if (!raw || raw.startsWith("#")) {
        errors.push(id);
        continue;
      }

      const price = parseFloat(raw.replace(/,/g, ""));
      if (!isNaN(price) && price > 0) {
        prices[id] = price;
      } else {
        errors.push(id);
      }
    }

    return NextResponse.json({ success: true, prices, errors });
  } catch (error) {
    console.error("[prices error]", (error as Error).message);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 },
    );
  }
}
