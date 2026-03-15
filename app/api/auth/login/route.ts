import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const { password } = await request.json();

  if (password !== process.env.SITE_PASSWORD) {
    return NextResponse.json(
      { success: false, error: "비밀번호가 올바르지 않습니다" },
      { status: 401 },
    );
  }

  const response = NextResponse.json({ success: true });
  response.cookies.set("auth", "1", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    // 브라우저 닫으면 만료 (세션 쿠키)
  });
  return response;
}
