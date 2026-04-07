import { NextResponse } from "next/server";

const SOL_MINT = "So11111111111111111111111111111111111111112";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mint = searchParams.get("mint");
  const amount = searchParams.get("amount");

  if (!mint || !amount) {
    return NextResponse.json(
      { error: "Missing required searchParams: mint and amount" },
      { status: 400 }
    );
  }

  try {
    const jupiterUrl =
      `https://quote-api.jup.ag/v6/quote?inputMint=${encodeURIComponent(mint)}` +
      `&outputMint=${SOL_MINT}&amount=${encodeURIComponent(amount)}&slippageBps=50`;

    const response = await fetch(jupiterUrl, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`Jupiter quote failed (${response.status})`);
    }

    const data = (await response.json()) as unknown;
    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
