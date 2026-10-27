import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const redirectTo = request.nextUrl.searchParams.get("next") ?? "/profile";
  const safePath = redirectTo.startsWith("/") && !redirectTo.startsWith("//") && !redirectTo.startsWith("/\\") ? redirectTo : "/profile";
  if (code && process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    const response = NextResponse.redirect(new URL(safePath, request.url));
    const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { cookies: { getAll: () => request.cookies.getAll(), setAll: (values) => values.forEach(({ name, value, options }) => response.cookies.set(name, value, options)) } });
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) return NextResponse.redirect(new URL("/sign-in?message=Authentication%20could%20not%20be%20completed", request.url));
    return response;
  }
  return NextResponse.redirect(new URL("/sign-in?message=Authentication%20could%20not%20be%20completed", request.url));
}
