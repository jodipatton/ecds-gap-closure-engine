import { NextResponse } from 'next/server';
import { repos, readSeedSummary } from '@/lib/data/repository';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const format = url.searchParams.get('format') ?? 'json';
  const [results, summary] = await Promise.all([repos.hedisResults.list(), readSeedSummary()]);

  if (format === 'csv') {
    const header = [
      'measureId', 'measureName', 'dataTier', 'domain',
      'eligiblePopulation', 'exclusions',
      'numeratorFromClaims', 'numeratorFromClinical', 'combinedNumerator',
      'gapCount', 'ratePct'
    ];
    const lines = [header.join(',')];
    for (const r of results) {
      lines.push([
        r.measureId, JSON.stringify(r.measureName), r.dataTier, JSON.stringify(r.domain),
        r.eligiblePopulation, r.exclusions,
        r.numeratorFromClaims, r.numeratorFromClinical, r.combinedNumerator,
        r.gapCount, r.rate
      ].join(','));
    }
    return new NextResponse(lines.join('\n'), {
      status: 200,
      headers: {
        'content-type': 'text/csv',
        'content-disposition': `attachment; filename="ecds-report-${summary?.measurementYear ?? 'unknown'}.csv"`
      }
    });
  }

  return NextResponse.json({
    measurementYear: summary?.measurementYear,
    generatedAt: new Date().toISOString(),
    note: 'Illustrative preview of NCQA IDSS submission data. Not a licensed export.',
    measures: results
  });
}
