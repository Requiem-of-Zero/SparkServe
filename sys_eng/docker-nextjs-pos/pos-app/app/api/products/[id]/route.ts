import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

type ProductRouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function DELETE(_request: Request, { params }: ProductRouteContext) {
  const { id } = await params;
  const productId = Number(id);

  if (!Number.isInteger(productId) || productId <= 0) {
    return NextResponse.json(
      { error: "Product id must be a positive integer." },
      { status: 400 },
    );
  }

  const result = await pool.query(
    "DELETE FROM products WHERE id = $1 RETURNING *",
    [productId],
  );

  if (result.rowCount === 0) {
    return NextResponse.json({ error: "Product not found." }, { status: 404 });
  }

  return NextResponse.json(result.rows[0]);
}
