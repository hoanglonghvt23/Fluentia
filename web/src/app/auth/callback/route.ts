import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Google chuyển về đây kèm mã; đổi mã lấy phiên đăng nhập rồi vào trang chủ.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}/`);
  }
  // Email chưa được admin cho phép sẽ bị trigger từ chối nên rơi vào đây.
  return NextResponse.redirect(`${origin}/login?error=google_denied`);
}
