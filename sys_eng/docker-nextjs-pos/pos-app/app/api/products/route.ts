import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

export async function GET() {
  const result = await pool.query("SELECT * FROM products ORDER BY id ASC");
  return NextResponse.json(result.rows);
}

export async function POST(request: Request) {
  const body = await request.json();
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const price = Number(body.price);

  if (!name || !Number.isFinite(price) || price < 0) {
    return NextResponse.json(
      { error: "Product name and a valid price are required." },
      { status: 400 },
    );
  }

  const result = await pool.query(
    "INSERT INTO products (name, price) VALUES ($1, $2) RETURNING *",
    [name, price],
  );

  return NextResponse.json(result.rows[0], { status: 201 });
}
