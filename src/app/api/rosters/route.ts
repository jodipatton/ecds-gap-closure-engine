import { NextResponse } from 'next/server';
import { buildRoster, rosterToCsv, type RosterAudience } from '@/lib/rosters/roster';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const audience = (url.searchParams.get('audience') === 'provider'
    ? 'provider'
    : 'payer') as RosterAudience;
  const npi = url.searchParams.get('npi') ?? undefined;
  const format = url.searchParams.get('format') ?? 'json';

  if (audience === 'provider' && !npi) {
    return NextResponse.json({ ok: false, error: 'npi is required for a provider roster' }, { status: 400 });
  }

  const result = await buildRoster(audience, npi);

  if (format === 'csv') {
    const tag = audience === 'provider' ? `provider-${npi}` : 'payer';
    return new NextResponse(rosterToCsv(result), {
      status: 200,
      headers: {
        'content-type': 'text/csv',
        'content-disposition': `attachment; filename="roster-${tag}-${result.measurementYear}.csv"`
      }
    });
  }

  return NextResponse.json({ ok: true, ...result });
}
