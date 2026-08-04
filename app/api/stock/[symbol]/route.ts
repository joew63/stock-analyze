import { NextRequest, NextResponse } from "next/server";
import { getStockData, SymbolNotFoundError } from "@/lib/stockData";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ symbol: string }> }
) {
  const { symbol: rawSymbol } = await params;
  const symbol = rawSymbol.trim().toUpperCase();

  if (!/^[A-Z.\-]{1,10}$/.test(symbol)) {
    return NextResponse.json({ error: "Invalid ticker symbol" }, { status: 400 });
  }

  try {
    const data = await getStockData(symbol);
    return NextResponse.json(data);
  } catch (err) {
    if (err instanceof SymbolNotFoundError) {
      return NextResponse.json(
        { error: err.message, causes: err.causes },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { error: "Unexpected error fetching stock data." },
      { status: 500 }
    );
  }
}
