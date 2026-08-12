#!/usr/bin/env node
/**
 * build-backend.mjs — 跨平台 PyInstaller 后端打包（v1.0.33 多端）
 *
 * 将此前手动的 PyInstaller 流程固化为可复现的构建步骤：
 *   1. 探测 Python（KNOWE_DEV_PYTHON → python3 → python）
 *   2. pip install 运行时依赖 + pyinstaller（已装包 no-op，不破坏现有环境）
 *   3. pyinstaller backend/KnoweBackend.spec（从项目根运行，产物落 dist/KnoweBackend/）
 *   4. python -m playwright install chromium-headless-shell（随包浏览器内核）
 *
 * 产物 dist/KnoweBackend/ 由 electron-builder extraResources 整体拷为 resources/backend/。
 * 后续 copy-chromium.mjs 把 ms-playwright 内核拷入 dist/KnoweBackend/ms-playwright/。
 */
import { existsSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DIST_BACKEND = join(ROOT, 'dist', 'KnoweBackend');
const SPEC = join(ROOT, 'backend', 'KnoweBackend.spec');

function findPython() {
  const candidates = [process.env.KNOWE_DEV_PYTHON, 'python3', 'python'].filter(Boolean);
  for (const exe of candidates) {
    const r = spawnSync(exe, ['--version'], { encoding: 'utf8' });
    if (!r.error && r.status === 0 && /Python 3\./.test(r.stdout + r.stderr)) return exe;
  }
  console.error('[build-backend] 找不到 Python 3；请安装 Python 3.11+ 或设置 KNOWE_DEV_PYTHON');
  process.exit(1);
}

function run(cmd, args, label) {
  console.log(`\n[build-backend] ▸ ${label}`);
  const r = spawnSync(cmd, args, {
    cwd: ROOT,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
  if (r.status !== 0) {
    console.error(`[build-backend] ${label} 失败（exit ${r.status}）`);
    process.exit(r.status ?? 1);
  }
}

console.log('[build-backend] 跨平台 PyInstaller 后端打包');

const python = findPython();
console.log(`[build-backend] Python: ${python}`);

// 1. 安装运行时依赖 + pyinstaller（pip 对已满足依赖是 no-op）
const deps = [
  'websockets>=14',
  'httpx>=0.27',
  'python-dotenv>=1.0',
  'playwright',
  'duckduckgo_search',
  'pyyaml',
  'pyinstaller>=6',
];
run(python, ['-m', 'pip', 'install', ...deps], 'pip install 运行时依赖');

// 2. playwright chromium-headless-shell（供 copy-chromium.mjs 拷入随包）
run(python, ['-m', 'playwright', 'install', 'chromium-headless-shell'], 'playwright install chromium-headless-shell');

// 3. pyinstaller（从项目根运行，产物落 dist/KnoweBackend/，匹配 electron-builder extraResources）
if (!existsSync(SPEC)) {
  console.error(`[build-backend] spec 不存在：${SPEC}`);
  process.exit(1);
}
run(python, ['-m', 'PyInstaller', SPEC, '--noconfirm'], 'pyinstaller');

// 4. 确认产物
if (!existsSync(DIST_BACKEND)) {
  console.error(`[build-backend] 产物未生成：${DIST_BACKEND}`);
  process.exit(1);
}
console.log(`\n[build-backend] ✅ 完成：${DIST_BACKEND}`);
