import { NextResponse } from 'next/server';
import { readdirSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const dir = join(homedir(), '.openclaw');
    const backups = readdirSync(dir)
      .filter((f) => f.startsWith('openclaw.json.bak.step123-apply.'))
      .sort()
      .reverse()
      .slice(0, 20)
      .map((f) => join(dir, f));
    return NextResponse.json({ ok: true, backups });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}
