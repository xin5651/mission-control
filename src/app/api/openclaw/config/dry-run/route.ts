import { NextRequest, NextResponse } from 'next/server';
import { existsSync, readFileSync, statSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

export const dynamic = 'force-dynamic';

const MAX_CONFIG_SIZE_BYTES = 1024 * 1024 * 2;

type DesiredState = {
  defaultModel?: string;
  imageModelPrimary?: string;
  imageModelFallbacks?: string[];
  sandboxMode?: 'off' | 'workspace-write' | 'all';
  toolsProfile?: string;
};

function shallowClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

function applyDesired(cfg: any, desired: DesiredState) {
  const out = shallowClone(cfg || {});
  out.agents = out.agents || {};
  out.agents.defaults = out.agents.defaults || {};
  out.agents.defaults.model = out.agents.defaults.model || {};
  out.agents.defaults.imageModel = out.agents.defaults.imageModel || {};
  out.agents.defaults.sandbox = out.agents.defaults.sandbox || {};
  out.tools = out.tools || {};

  if (desired.defaultModel) out.agents.defaults.model.primary = desired.defaultModel;
  if (desired.imageModelPrimary) out.agents.defaults.imageModel.primary = desired.imageModelPrimary;
  if (Array.isArray(desired.imageModelFallbacks)) out.agents.defaults.imageModel.fallbacks = desired.imageModelFallbacks;
  if (desired.sandboxMode) out.agents.defaults.sandbox.mode = desired.sandboxMode;
  if (desired.toolsProfile) out.tools.profile = desired.toolsProfile;

  return out;
}

function pickSnapshot(cfg: any) {
  return {
    defaultModel: cfg?.agents?.defaults?.model?.primary || null,
    imageModelPrimary: cfg?.agents?.defaults?.imageModel?.primary || null,
    imageModelFallbacks: cfg?.agents?.defaults?.imageModel?.fallbacks || [],
    sandboxMode: cfg?.agents?.defaults?.sandbox?.mode || null,
    toolsProfile: cfg?.tools?.profile || null,
  };
}

function diff(before: any, after: any) {
  const keys = Array.from(new Set([...Object.keys(before || {}), ...Object.keys(after || {})]));
  const changes: Array<{ key: string; before: any; after: any }> = [];
  for (const k of keys) {
    const b = JSON.stringify(before?.[k]);
    const a = JSON.stringify(after?.[k]);
    if (b !== a) changes.push({ key: k, before: before?.[k], after: after?.[k] });
  }
  return changes;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const desired: DesiredState = body?.desired || {};

    const configPath = join(homedir(), '.openclaw', 'openclaw.json');
    if (!existsSync(configPath)) {
      return NextResponse.json({ ok: false, error: 'openclaw.json not found', configPath }, { status: 404 });
    }
    const stats = statSync(configPath);
    if (stats.size > MAX_CONFIG_SIZE_BYTES) {
      return NextResponse.json({ ok: false, error: 'Config file too large' }, { status: 413 });
    }

    const raw = readFileSync(configPath, 'utf-8');
    const current = JSON.parse(raw);
    const proposed = applyDesired(current, desired);

    const before = pickSnapshot(current);
    const after = pickSnapshot(proposed);

    return NextResponse.json({
      ok: true,
      mode: 'dry-run',
      desired,
      before,
      after,
      changes: diff(before, after),
      notes: [
        'This endpoint does not write any file.',
        'Apply endpoint will be added in Step 122/123 with backup+rollback.',
      ],
    });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}
