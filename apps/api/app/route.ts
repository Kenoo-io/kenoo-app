import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json({
    name: "Kenoo API",
    status: "ok",
    version: "v1",
  });
}
