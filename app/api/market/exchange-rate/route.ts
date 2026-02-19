import { NextResponse } from "next/server";

export async function GET() {
  try {
    const res = await fetch("https://api.frankfurter.app/latest?from=USD&to=KRW", {
      cache: "no-store",
    });
    if (!res.ok) throw new Error("환율 조회 실패");
    const data = await res.json();
    const rate: number = data.rates?.KRW;
    if (!rate) throw new Error("KRW 환율 없음");
    return NextResponse.json({ success: true, rate });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 },
    );
  }
}
