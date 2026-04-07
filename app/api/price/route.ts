import { NextResponse } from 'next/server';

// LA LIGNE MAGIQUE QUI RÈGLE L'ERREUR DYNAMIC_SERVER_USAGE :
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const mint = searchParams.get('mint');
    const amount = searchParams.get('amount');

    if (!mint || !amount) {
      return NextResponse.json({ error: 'Missing mint or amount' }, { status: 400 });
    }

    const jupiterUrl = `https://quote-api.jup.ag/v6/quote?inputMint=${mint}&outputMint=So11111111111111111111111111111111111111112&amount=${amount}&slippageBps=50`;
    
    const response = await fetch(jupiterUrl, { cache: 'no-store' });
    const data = await response.json();

    if (!response.ok) {
      console.error("[Jupiter API Error]:", data);
      return NextResponse.json({ error: 'Jupiter API failed', details: data }, { status: response.status });
    }

    return NextResponse.json(data, { status: 200 });

  } catch (error) {
    console.error("[Proxy Backend Error]:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}