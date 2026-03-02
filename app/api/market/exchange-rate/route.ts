import { NextResponse } from "next/server";
import { getGoogleSheetsClient, SPREADSHEET_ID } from "@/lib/google-sheets-client";

export async function GET() {
  try {
    const sheets = getGoogleSheetsClient();
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: "investments_transactions!L1",
    });
    const value = response.data.values?.[0]?.[0];
    const rate = Number(value);
    if (!rate) throw new Error("환율 값이 없거나 유효하지 않습니다");
    return NextResponse.json({ success: true, rate });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 },
    );
  }
}

export const dynamic = "force-dynamic";
