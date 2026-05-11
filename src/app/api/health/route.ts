import { NextResponse } from 'next/server';
import { activeBackend } from '@/lib/data/repository';
export const dynamic = 'force-dynamic';
export async function GET() {
  return NextResponse.json({
    vercel: process.env.VERCEL === '1',
    vercelEnv: process.env.VERCEL_ENV ?? null,
    backend: activeBackend(),
    kvUrlPresent: Boolean(process.env.KV_REST_API_URL),
    kvUrlPreview: process.env.KV_REST_API_URL
      ? process.env.KV_REST_API_URL.slice(0, 24) + '...'
      : null,
    nodeVersion: process.version
  });
}
