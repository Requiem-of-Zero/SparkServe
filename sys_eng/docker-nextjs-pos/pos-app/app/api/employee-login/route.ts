import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Staff log in with a private restaurant code, but Better Auth verifies passwords by email.
// This route translates loginCode -> email server-side so the browser never needs that mapping.
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const employeeCode =
    typeof body?.employeeCode === "string" ? body.employeeCode.trim() : "";
  const password = typeof body?.password === "string" ? body.password : "";

  if (!/^\d{6}$/.test(employeeCode) || password.length === 0) {
    return NextResponse.json({ error: "Invalid employee code or password." }, { status: 401 });
  }

  const employee = await prisma.employeeProfile.findUnique({
    where: { loginCode: employeeCode },
    include: { user: true },
  });

  if (!employee || !employee.active || employee.resignedAt) {
    return NextResponse.json({ error: "Invalid employee code or password." }, { status: 401 });
  }

  const signInUrl = new URL("/api/auth/sign-in/email", request.url);
  const signInRequest = new Request(signInUrl, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: request.headers.get("cookie") ?? "",
      origin: request.headers.get("origin") ?? signInUrl.origin,
    },
    body: JSON.stringify({
      email: employee.user.email,
      password,
      callbackURL: "/staff",
    }),
  });

  return auth.handler(signInRequest);
}
