import { NextResponse } from 'next/server';
import packageJson from '@/../package.json';

export async function GET() {
  return NextResponse.json({
    latestVersion: process.env.APP_VERSION || packageJson.version,
    releaseNotesUrl: 'https://github.com/tbagriyanik/NetworkSimulator/releases',
  });
}
