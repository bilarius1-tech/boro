import { NextResponse } from "next/server";
import { getFeedPage } from "@/lib/listings";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const cursor = searchParams.get("cursor");
  const limit = Number(searchParams.get("limit") || "8");

  const page = await getFeedPage({ cursor, limit });
  return NextResponse.json(page);
}
