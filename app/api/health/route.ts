import { NextResponse } from "next/server";

/** Public health check for status page. No auth required. */
export async function GET() {
  return NextResponse.json({
    status: "operational",
    service: "agents-dev",
    timestamp: new Date().toISOString(),
  });
}
