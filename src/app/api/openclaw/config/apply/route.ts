import { NextRequest, NextResponse } from 'next/server';
import { existsSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (body?.confirm !== true) {
      return NextResponse.json({ ok: false, error: 'confirm=true required' }, { status: 400 });
    }

    const desired = body?.desired || {};
    const configPath = join(homedir(), '.openclaw', 'openclaw.json');
    if (!existsSync(configPath)) {
      return NextResponse.json({ ok: false, error: 'openclaw.json not found', configPath }, { status: 404 });
    }

    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = `${configPath}.bak.step123-apply.${ts}`;

    const applyCommands: string[] = [];
    if (desired.defaultModel) applyCommands.push(`openclaw config set agents.defaults.model.primary '${desired.defaultModel}'`);
    if (desired.imageModelPrimary) applyCommands.push(`openclaw config set agents.defaults.imageModel.primary '${desired.imageModelPrimary}'`);
    if (desired.sandboxMode) applyCommands.push(`openclaw config set agents.defaults.sandbox.mode '${desired.sandboxMode}'`);
    if (desired.toolsProfile) applyCommands.push(`openclaw config set tools.profile '${desired.toolsProfile}'`);
    applyCommands.push('systemctl --user restart openclaw-gateway.service');
    applyCommands.push('openclaw status --deep');

    return NextResponse.json({
      ok: true,
      mode: 'confirm-required-plan',
      backupPath,
      backupCommand: `cp -a ${configPath} ${backupPath}`,
      applyCommands,
      note: 'Step 123 safe mode: returns executable plan. Real command execution will be enabled in next step after explicit approval.',
    });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}
