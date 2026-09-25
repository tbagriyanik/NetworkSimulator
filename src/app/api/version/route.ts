import { NextResponse } from 'next/server';
import packageJson from '../../../../package.json';

export async function GET() {
  return NextResponse.json({
    latestVersion: packageJson.version,
    releaseNotesUrl: 'https://github.com/tbagriyanik/NetworkSimulator/releases',
  });
}
