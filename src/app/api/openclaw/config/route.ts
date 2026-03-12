import { NextResponse } from 'next/server';
import { existsSync, readFileSync, statSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

export const dynamic = 'force-dynamic';

const MAX_CONFIG_SIZE_BYTES = 1024 * 1024 * 2;

function pickSnapshot(cfg: any) {
  return {
    agents: {
      defaults: {
        model: cfg?.agents?.defaults?.model || {},
        imageModel: cfg?.agents?.defaults?.imageModel || {},
        sandbox: cfg?.agents?.defaults?.sandbox || {},
      },
    },
    tools: cfg?.tools || {},
    channels: {
      telegram: cfg?.channels?.telegram || {},
      feishu: cfg?.channels?.feishu || {},
    },
    cron: cfg?.cron || {},
  };
}

export async function GET() {
  try {
    const configPath = join(homedir(), '.openclaw', 'openclaw.json');
    if (!existsSync(configPath)) {
      return NextResponse.json({ ok: false, error: 'openclaw.json not found', configPath }, { status: 404 });
    }

    const stats = statSync(configPath);
    if (stats.size > MAX_CONFIG_SIZE_BYTES) {
      return NextResponse.json({ ok: false, error: 'Config file too large' }, { status: 413 });
    }

    const raw = readFileSync(configPath, 'utf-8');
    const parsed = JSON.parse(raw);

    return NextResponse.json({
      ok: true,
      configPath,
      snapshot: pickSnapshot(parsed),
      updatedAt: stats.mtime.toISOString(),
    });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}
