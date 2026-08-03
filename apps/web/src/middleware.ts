import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
const INTERNAL_API_URL = process.env.INTERNAL_API_URL ?? PUBLIC_API_URL;

async function isSiteEnabled() {
  try {
    const res = await fetch(`${INTERNAL_API_URL}/api/billing/site-status`, {
      next: { revalidate: 30 },
    });
    if (!res.ok) return true;
    const data = (await res.json()) as { isSiteEnabled?: boolean };
    return data.isSiteEnabled !== false;
  } catch {
    return true;
  }
}

export async function middleware(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith("/maintenance")) {
    return NextResponse.next();
  }

  const enabled = await isSiteEnabled();
  if (!enabled) {
    const url = request.nextUrl.clone();
    url.pathname = "/maintenance";
    return NextResponse.rewrite(url, { status: 503 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
