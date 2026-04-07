import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const mint = searchParams.get('mint');
    const amount = searchParams.get('amount');

    if (!mint || !amount) {
      return NextResponse.json({ error: 'Missing mint or amount' }, { status: 400 });
    }

    // LA NOUVELLE ADRESSE OFFICIELLE JUPITER V1 (et pas la V6 morte !)
    const jupiterUrl = `https://api.jup.ag/swap/v1/quote?inputMint=${mint}&outputMint=So11111111111111111111111111111111111111112&amount=${amount}&slippageBps=50`;
    
    const response = await fetch(jupiterUrl, { cache: 'no-store' });
    
    // Si Jupiter renvoie une erreur (ex: pas assez de liquidité)
    if (!response.ok) {
      const errorData = await response.text(); // On lit en texte au cas où ce n'est pas du JSON
      console.error("[Jupiter API Error]:", errorData);
      return NextResponse.json({ error: 'Jupiter API failed', details: errorData }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data, { status: 200 });

  } catch (error) {
    console.error("[Proxy Backend Error]:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}