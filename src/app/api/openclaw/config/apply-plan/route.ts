import { NextRequest, NextResponse } from 'next/server';
import { existsSync, readFileSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

export const dynamic = 'force-dynamic';

type DesiredState = {
  defaultModel?: string;
  imageModelPrimary?: string;
  imageModelFallbacks?: string[];
  sandboxMode?: 'off' | 'workspace-write' | 'all';
  toolsProfile?: string;
};

function getCurrentSnapshot(cfg: any) {
  return {
    defaultModel: cfg?.agents?.defaults?.model?.primary || null,
    imageModelPrimary: cfg?.agents?.defaults?.imageModel?.primary || null,
    imageModelFallbacks: cfg?.agents?.defaults?.imageModel?.fallbacks || [],
    sandboxMode: cfg?.agents?.defaults?.sandbox?.mode || null,
    toolsProfile: cfg?.tools?.profile || null,
  };
}

function buildCommands(desired: DesiredState) {
  const cmds: string[] = [];
  if (desired.defaultModel) cmds.push(`openclaw config set agents.defaults.model.primary '${desired.defaultModel}'`);
  if (desired.imageModelPrimary) cmds.push(`openclaw config set agents.defaults.imageModel.primary '${desired.imageModelPrimary}'`);
  if (Array.isArray(desired.imageModelFallbacks)) cmds.push(`openclaw config set agents.defaults.imageModel.fallbacks '${JSON.stringify(desired.imageModelFallbacks)}'`);
  if (desired.sandboxMode) cmds.push(`openclaw config set agents.defaults.sandbox.mode '${desired.sandboxMode}'`);
  if (desired.toolsProfile) cmds.push(`openclaw config set tools.profile '${desired.toolsProfile}'`);
  cmds.push('systemctl --user restart openclaw-gateway.service');
  cmds.push('openclaw status --deep');
  return cmds;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const desired: DesiredState = body?.desired || {};
    const configPath = join(homedir(), '.openclaw', 'openclaw.json');
    if (!existsSync(configPath)) return NextResponse.json({ ok: false, error: 'openclaw.json not found', configPath }, { status: 404 });
    const raw = readFileSync(configPath, 'utf-8');
    const cfg = JSON.parse(raw);
    const current = getCurrentSnapshot(cfg);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = `${configPath}.bak.step122-plan.${timestamp}`;
    return NextResponse.json({
      ok: true,
      mode: 'plan-only',
      configPath,
      backupPlan: { required: true, command: `cp -a ${configPath} ${backupPath}`, target: backupPath },
      current,
      desired,
      applyCommands: buildCommands(desired),
      safetyChecks: ['Require explicit user confirmation before execute','Write 4 audit logs before marking completed','Run status validation after gateway restart'],
      note: 'This endpoint only generates an apply plan. It does not modify system state.',
    });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}
