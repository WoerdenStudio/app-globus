import { NextResponse } from 'next/server';
import { searchSwissAddresses } from '@/lib/address-search';

/** Proxy vers Nominatim (OpenStreetMap) — recherche d'adresses en Suisse */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q')?.trim();

  if (!query || query.length < 3) {
    return NextResponse.json([]);
  }

  return NextResponse.json(await searchSwissAddresses(query));
}
