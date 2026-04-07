import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const mint = searchParams.get('mint');
    const amount = searchParams.get('amount');

    if (!mint || !amount) {
      return NextResponse.json({ error: 'Missing mint or amount' }, { status: 400 });
    }

    // URL officielle de Jupiter V6
    const jupiterUrl = `https://quote-api.jup.ag/v6/quote?inputMint=${mint}&outputMint=So11111111111111111111111111111111111111112&amount=${amount}&slippageBps=50`;
    
    // On fait la requête vers Jupiter depuis le serveur Vercel
    const response = await fetch(jupiterUrl, { cache: 'no-store' });
    const data = await response.json();

    if (!response.ok) {
      console.error("[Jupiter API Error]:", data);
      return NextResponse.json({ error: 'Jupiter API failed', details: data }, { status: response.status });
    }

    // On renvoie le prix au frontend
    return NextResponse.json(data, { status: 200 });

  } catch (error) {
    console.error("[Proxy Backend Error]:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}