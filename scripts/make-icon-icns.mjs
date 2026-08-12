#!/usr/bin/env node
/**
 * make-icon-icns.mjs — 从 app-icon.png 生成 macOS .icns 和 Linux .png 图标（v1.0.33 多端）
 *
 * macOS：生成 .iconset 各尺寸帧 → iconutil 打包 icns（iconutil 仅 macOS 自带）
 * Linux：直接输出 512×512 png（electron-builder 接受 png 作为 linux icon）
 *
 * 输入：public/brand/app-icon.png（居中裁剪为正方形再缩放）
 * 输出：build/icon.icns（mac）/ build/icon.png（linux）
 *
 * 幂等：输出存在且源图哈希一致时跳过。
 */
import { existsSync, readFileSync, writeFileSync, mkdirSync, rmSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import sharp from 'sharp';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(ROOT, 'public', 'brand', 'app-icon.png');
const BUILD = join(ROOT, 'build');

function sha256(path) {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

function isFresh(out, srcHash) {
  const stamp = out + '.src-hash';
  return existsSync(out) && existsSync(stamp) && readFileSync(stamp, 'utf8') === srcHash;
}

async function makeSquareFrame(src, side, size) {
  return sharp(src)
    .resize(side, side, { fit: 'cover', position: 'centre' })
    .resize(size, size, { fit: 'cover' })
    .png()
    .toBuffer();
}

async function main() {
  if (!existsSync(SRC)) {
    console.error(`[make-icon-icns] 源图不存在：${SRC}`);
    process.exit(1);
  }

  const srcHash = sha256(SRC);
  mkdirSync(BUILD, { recursive: true });
  const meta = await sharp(SRC).metadata();
  const side = Math.min(meta.width, meta.height);

  if (process.platform === 'darwin') {
    const icnsOut = join(BUILD, 'icon.icns');
    if (isFresh(icnsOut, srcHash)) {
      console.log(`[make-icon-icns] 幂等跳过：${icnsOut}`);
      return;
    }

    // 生成 iconset 目录
    const iconset = join(BUILD, 'icon.iconset');
    rmSync(iconset, { recursive: true, force: true });
    mkdirSync(iconset, { recursive: true });

    const frames = [
      ['16x16', 16], ['16x16@2x', 32],
      ['32x32', 32], ['32x32@2x', 64],
      ['128x128', 128], ['128x128@2x', 256],
      ['256x256', 256], ['256x256@2x', 512],
      ['512x512', 512], ['512x512@2x', 1024],
    ];
    for (const [name, size] of frames) {
      const buf = await makeSquareFrame(SRC, side, size);
      writeFileSync(join(iconset, `icon_${name}.png`), buf);
    }

    // iconutil 打包
    const r = spawnSync('iconutil', ['-c', 'icns', iconset, '-o', icnsOut], { stdio: 'inherit' });
    rmSync(iconset, { recursive: true, force: true });
    if (r.status !== 0) {
      console.error('[make-icon-icns] iconutil 失败');
      process.exit(r.status ?? 1);
    }
    writeFileSync(icnsOut + '.src-hash', srcHash);
    const kb = Math.round(statSync(icnsOut).size / 1024);
    console.log(`[make-icon-icns] 已生成 ${icnsOut}（${kb}KB）`);
  }

  // Linux png（所有平台都生成，无害）
  const pngOut = join(BUILD, 'icon.png');
  if (isFresh(pngOut, srcHash)) {
    console.log(`[make-icon-icns] 幂等跳过：${pngOut}`);
    return;
  }
  const png512 = await makeSquareFrame(SRC, side, 512);
  writeFileSync(pngOut, png512);
  writeFileSync(pngOut + '.src-hash', srcHash);
  console.log(`[make-icon-icns] 已生成 ${pngOut}（512×512）`);
}

main().catch((err) => {
  console.error('[make-icon-icns] 失败：', err.message);
  process.exit(1);
});
