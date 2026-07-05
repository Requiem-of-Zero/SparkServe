import { NextResponse } from "next/server";

import { getOrCreateOpenTableSession } from "@/lib/table-sessions";

export async function POST(request: Request) {
  const body = await request.json();
  const tableId = Number(body.tableId);

  if (!Number.isInteger(tableId) || tableId <= 0) {
    return NextResponse.json({ error: "Invalid tableId" }, { status: 400 });
  }

  const session = await getOrCreateOpenTableSession(tableId);

  return NextResponse.json({ session });
}
