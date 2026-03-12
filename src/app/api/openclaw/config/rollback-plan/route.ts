import { NextRequest, NextResponse } from 'next/server';
import { existsSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const backupPath = (await req.json())?.backupPath as string | undefined;
    const configPath = join(homedir(), '.openclaw', 'openclaw.json');

    if (!backupPath) {
      return NextResponse.json({ ok: false, error: 'backupPath is required' }, { status: 400 });
    }
    if (!existsSync(backupPath)) {
      return NextResponse.json({ ok: false, error: 'Backup file not found', backupPath }, { status: 404 });
    }

    return NextResponse.json({
      ok: true,
      mode: 'rollback-plan-only',
      rollbackCommands: [
        `cp -a ${backupPath} ${configPath}`,
        'systemctl --user restart openclaw-gateway.service',
        'openclaw status --deep',
      ],
      note: 'Plan only. No command executed.',
    });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}
