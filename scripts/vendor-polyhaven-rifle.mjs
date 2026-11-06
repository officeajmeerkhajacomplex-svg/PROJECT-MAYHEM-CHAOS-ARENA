import { mkdir, writeFile, readdir, rm, stat } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import path from 'node:path';

const id = 'bolt_action_rifle_7_62';
const root = path.resolve('public/assets/weapons', id);
const API = 'https://api.polyhaven.com';

async function json(url) {
  const response = await fetch(url, { headers: { 'User-Agent': 'ProjectMayhemAssetVendor/1.0' } });
  if (!response.ok) throw new Error(`Poly Haven request failed (${response.status}): ${url}`);
  return response.json();
}
async function download(url, destination) {
  const response = await fetch(url, { headers: { 'User-Agent': 'ProjectMayhemAssetVendor/1.0' } });
  if (!response.ok) throw new Error(`Poly Haven download failed (${response.status}): ${url}`);
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (!bytes.byteLength) throw new Error(`Empty Poly Haven download: ${url}`);
  await mkdir(path.dirname(destination), { recursive: true });
  await writeFile(destination, bytes);
  return bytes.byteLength;
}
function safeRelative(input) {
  let clean = String(input).split(String.fromCharCode(92)).join('/');
  while (clean.startsWith('/')) clean = clean.slice(1);
  const parts = clean.split('/');
  if (parts.some((part) => !part || part === '.' || part === '..')) throw new Error(`Unsafe dependency path: ${input}`);
  return parts.join('/');
}

const files = await json(`${API}/files/${id}`);
const variants = files?.gltf || {};
const resolution = ['2k', '1k', '4k'].find((key) => variants?.[key]?.gltf?.url);
if (!resolution) throw new Error('Poly Haven did not return a downloadable glTF for the bolt-action rifle.');
const model = variants[resolution].gltf;
if (!model?.url || !model.include || typeof model.include !== 'object') throw new Error('Incomplete rifle glTF dependency manifest.');

await mkdir(root, { recursive: true });
const source = path.join(root, 'source.gltf');
const output = path.join(root, 'model.glb');
await download(model.url, source);
let dependencies = 0;
for (const [relative, item] of Object.entries(model.include)) {
  if (!item?.url) continue;
  await download(item.url, path.join(root, safeRelative(relative)));
  dependencies++;
}
execFileSync('gltf-transform', [
  'optimize', source, output,
  '--compress', 'meshopt', '--texture-compress', 'webp', '--texture-size', '2048',
  '--simplify', 'true', '--simplify-ratio', '0.72', '--simplify-error', '0.6'
], { stdio: 'inherit' });
const bytes = (await stat(output)).size;
if (bytes > 45 * 1024 * 1024) throw new Error(`Optimized rifle is too large: ${(bytes / 1024 / 1024).toFixed(1)} MiB`);
for (const entry of await readdir(root, { withFileTypes: true })) {
  if (entry.name !== 'model.glb') await rm(path.join(root, entry.name), { recursive: true, force: true });
}
await writeFile(path.join(root, 'ASSET-SOURCE.txt'),
  ['Poly Haven asset: Bolt Action Rifle 7.62','Author: Mateusz Sadek','License: CC0','Source: https://polyhaven.com/a/bolt_action_rifle_7_62','Optimized as self-contained Meshopt GLB with WebP textures.'].join(String.fromCharCode(10)));
await writeFile(path.join(root, 'manifest.json'), JSON.stringify({
  id, name: 'Bolt Action Rifle 7.62', author: 'Mateusz Sadek',
  source: 'https://polyhaven.com/a/bolt_action_rifle_7_62',
  license: 'CC0', resolution, format: 'GLB / Meshopt / WebP',
  sourceDependencyCount: dependencies, bytes
}, null, 2) + String.fromCharCode(10));
console.log(`Vendored Poly Haven Bolt Action Rifle 7.62: ${(bytes / 1024 / 1024).toFixed(2)} MiB (${resolution})`);
