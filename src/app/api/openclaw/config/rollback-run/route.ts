import { NextRequest, NextResponse } from 'next/server';
import { existsSync } from 'fs';
import { execSync } from 'child_process';

export const dynamic = 'force-dynamic';

function run(cmd: string) {
  const out = execSync(cmd, { encoding: 'utf-8', stdio: 'pipe' });
  return String(out || '').slice(0, 1200);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const confirmed = body?.confirm === true && body?.confirmText === 'ROLLBACK_NOW';
    if (!confirmed) {
      return NextResponse.json({ ok: false, error: 'confirm=true + confirmText=ROLLBACK_NOW required' }, { status: 400 });
    }

    const backupPath = body?.backupPath as string | undefined;
    if (!backupPath) return NextResponse.json({ ok: false, error: 'backupPath is required' }, { status: 400 });
    if (!existsSync(backupPath)) return NextResponse.json({ ok: false, error: 'Backup not found', backupPath }, { status: 404 });

    const configPath = '/root/.openclaw/openclaw.json';
    const commands = [
      `cp -a ${backupPath} ${configPath}`,
      'systemctl --user restart openclaw-gateway.service',
      'openclaw status --deep',
    ];

    const results: Array<{ command: string; ok: boolean; output?: string; error?: string }> = [];
    for (const cmd of commands) {
      try {
        const output = run(cmd);
        results.push({ command: cmd, ok: true, output });
      } catch (e: any) {
        results.push({ command: cmd, ok: false, error: String(e?.stderr || e?.message || e).slice(0, 1200) });
        return NextResponse.json({ ok: false, results, error: 'Rollback failed.' }, { status: 500 });
      }
    }

    return NextResponse.json({ ok: true, restoredFrom: backupPath, results, executedAt: new Date().toISOString() });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}
