import { NextRequest, NextResponse } from 'next/server';
import { existsSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import { execSync } from 'child_process';

export const dynamic = 'force-dynamic';

type DesiredState = {
  defaultModel?: string;
  imageModelPrimary?: string;
  imageModelFallbacks?: string[];
  sandboxMode?: 'off' | 'workspace-write' | 'all';
  toolsProfile?: string;
};

function run(cmd: string) {
  const out = execSync(cmd, { encoding: 'utf-8', stdio: 'pipe' });
  return String(out || '').slice(0, 1200);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const confirmed = body?.confirm === true && body?.confirmText === 'APPLY_NOW';
    if (!confirmed) {
      return NextResponse.json({ ok: false, error: 'confirm=true + confirmText=APPLY_NOW required' }, { status: 400 });
    }

    const desired: DesiredState = body?.desired || {};
    const configPath = join(homedir(), '.openclaw', 'openclaw.json');
    if (!existsSync(configPath)) {
      return NextResponse.json({ ok: false, error: 'openclaw.json not found', configPath }, { status: 404 });
    }

    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = `${configPath}.bak.step124-apply-run.${ts}`;
    run(`cp -a ${configPath} ${backupPath}`);

    const commands: string[] = [];
    if (desired.defaultModel) commands.push(`openclaw config set agents.defaults.model.primary '${desired.defaultModel}'`);
    if (desired.imageModelPrimary) commands.push(`openclaw config set agents.defaults.imageModel.primary '${desired.imageModelPrimary}'`);
    if (Array.isArray(desired.imageModelFallbacks)) commands.push(`openclaw config set agents.defaults.imageModel.fallbacks '${JSON.stringify(desired.imageModelFallbacks)}'`);
    if (desired.sandboxMode) commands.push(`openclaw config set agents.defaults.sandbox.mode '${desired.sandboxMode}'`);
    if (desired.toolsProfile) commands.push(`openclaw config set tools.profile '${desired.toolsProfile}'`);
    commands.push('systemctl --user restart openclaw-gateway.service');
    commands.push('openclaw status --deep');

    const results: Array<{ command: string; ok: boolean; output?: string; error?: string }> = [];
    for (const cmd of commands) {
      try {
        const output = run(cmd);
        results.push({ command: cmd, ok: true, output });
      } catch (e: any) {
        results.push({ command: cmd, ok: false, error: String(e?.stderr || e?.message || e).slice(0, 1200) });
        return NextResponse.json({ ok: false, backupPath, results, error: 'Apply failed; use rollback-run with backupPath.' }, { status: 500 });
      }
    }

    return NextResponse.json({ ok: true, backupPath, results, executedAt: new Date().toISOString() });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}
