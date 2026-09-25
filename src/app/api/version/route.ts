import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    latestVersion: process.env.APP_VERSION || '6.6.1',
    releaseNotesUrl: 'https://github.com/tbagriyanik/NetworkSimulator/releases',
  });
}
