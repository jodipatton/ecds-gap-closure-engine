import { NextResponse } from 'next/server';
import { repos } from '@/lib/data/repository';

export const dynamic = 'force-dynamic';

export async function GET(_req: Request, { params }: { params: { npi: string } }) {
  const [providers, connections] = await Promise.all([
    repos.providers.list(),
    repos.ehrConnections.list()
  ]);
  const provider = providers.find((p) => p.npi === params.npi);
  if (!provider) {
    return NextResponse.json({ ok: false, error: 'Provider not found' }, { status: 404 });
  }
  const connection = connections.find((c) => c.providerNpi === params.npi);
  if (!connection) {
    return NextResponse.json({
      ok: true,
      provider: { npi: provider.npi, organizationName: provider.organizationName, ehrPlatform: provider.ehrPlatform },
      connection: null,
      alerts: [{ severity: 'info', message: 'No EHR connection configured. Complete setup on the Connect page.' }]
    });
  }
  const alerts: Array<{ severity: 'info' | 'warn' | 'error'; message: string }> = [];
  if (connection.connectionStatus === 'expired') {
    alerts.push({ severity: 'warn', message: 'Connection token expired. Click "Re-authenticate" to refresh.' });
  }
  if (connection.connectionStatus === 'error') {
    alerts.push({ severity: 'error', message: connection.lastErrorMessage ?? 'Unknown error on last sync.' });
  }
  if (connection.connectionStatus === 'pending-setup') {
    alerts.push({ severity: 'info', message: 'Setup not yet completed. Finish the connection wizard.' });
  }
  return NextResponse.json({
    ok: true,
    provider: {
      npi: provider.npi,
      organizationName: provider.organizationName,
      ehrPlatform: provider.ehrPlatform,
      fhirEndpointUrl: provider.fhirEndpointUrl
    },
    connection,
    alerts
  });
}

// Simulated "re-sync now"
export async function POST(_req: Request, { params }: { params: { npi: string } }) {
  const connections = await repos.ehrConnections.list();
  const existing = connections.find((c) => c.providerNpi === params.npi);
  if (!existing) {
    return NextResponse.json({ ok: false, error: 'No connection to re-sync' }, { status: 404 });
  }
  const now = new Date().toISOString();
  const synced = Math.floor(50 + Math.random() * 500);
  const updated = {
    ...existing,
    lastTokenRefresh: now,
    lastSuccessfulSync: now,
    totalRecordsSynced: existing.totalRecordsSynced + synced,
    connectionStatus: 'active' as const,
    lastErrorMessage: null
  };
  await repos.ehrConnections.upsertOne(updated, 'providerNpi');
  return NextResponse.json({ ok: true, mode: 'simulated', synced, connection: updated });
}
