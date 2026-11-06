import { mkdir, writeFile, readdir, rm, stat } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import path from 'node:path';

const API = 'https://api.polyhaven.com';
const COLLECTION = 'pine_forest';
const root = path.resolve('public/assets/polyhaven');
const sourceNote = (id) => `Poly Haven asset: ${id}\nCollection: Pine Forest\nLicense: CC0\nSource: https://polyhaven.com/a/${id}\nDownloaded by scripts/vendor-polyhaven-assets.mjs\n`;

function safeRelative(input) {
  const normalized = String(input).split(String.fromCharCode(92)).join('/');
  const clean = normalized.replace(/^\/+/, '');
  const parts = clean.split('/');
  if (parts.some((part) => !part || part === '.' || part === '..')) {
    throw new Error(`Unsafe Poly Haven dependency path: ${input}`);
  }
  return parts.join('/');
}

async function json(url) {
  const response = await fetch(url, { headers: { 'User-Agent': 'ProjectMayhemAssetVendor/1.0' } });
  if (!response.ok) throw new Error(`Request failed (${response.status}): ${url}`);
  return response.json();
}

async function download(url, destination) {
  const response = await fetch(url, { headers: { 'User-Agent': 'ProjectMayhemAssetVendor/1.0' } });
  if (!response.ok) throw new Error(`Download failed (${response.status}): ${url}`);
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (!bytes.byteLength) throw new Error(`Empty download: ${url}`);
  await mkdir(path.dirname(destination), { recursive: true });
  await writeFile(destination, bytes);
  return bytes.byteLength;
}

const collection = await json(`${API}/assets?type=models&collection=${COLLECTION}`);
const entries = Object.entries(collection || {});
if (!entries.length) throw new Error('Poly Haven returned no Pine Forest models; refusing to publish an empty asset manifest.');

const manifest = [];
let collectionBytes = 0;
for (const [id, metadata] of entries) {
  console.log(`Fetching Pine Forest model: ${id} (${metadata.name || id})`);
  const files = await json(`${API}/files/${encodeURIComponent(id)}`);
  const variants = files?.gltf || files?.modelFiles?.gltf || {};
  const resolution = ['1k', '2k', '4k'].find((key) => variants?.[key]?.gltf?.url);
  if (!resolution) throw new Error(`No downloadable glTF variant for Pine Forest model ${id}`);
  const model = variants[resolution].gltf;
  if (!model?.url || !model.include || typeof model.include !== 'object') {
    throw new Error(`Incomplete glTF/dependency manifest for ${id}`);
  }

  const folder = path.join(root, id);
  let totalBytes = await download(model.url, path.join(folder, 'model.gltf'));
  let dependencyCount = 0;
  for (const [relative, file] of Object.entries(model.include)) {
    if (!file?.url) continue;
    totalBytes += await download(file.url, path.join(folder, safeRelative(relative)));
    dependencyCount += 1;
  }
  // Produce a self-contained optimized GLB; GitHub rejects individual files over 100 MB.
  const sourceModel = path.join(folder, 'model.gltf');
  const optimizedModel = path.join(folder, 'model.glb');
  const optimize = (ratio) => execFileSync('gltf-transform', [
    'optimize', sourceModel, optimizedModel,
    '--compress', 'meshopt', '--texture-compress', 'webp', '--texture-size', '1024',
    '--simplify', 'true', '--simplify-ratio', String(ratio), '--simplify-error', '1'
  ], { stdio: 'inherit' });
  optimize(0.12);
  let optimizedBytes = (await stat(optimizedModel)).size;
  if (optimizedBytes > 85 * 1024 * 1024) {
    console.warn('Optimized ' + id + ' is still large; simplifying further.');
    optimize(0.04);
    optimizedBytes = (await stat(optimizedModel)).size;
  }
  if (optimizedBytes > 95 * 1024 * 1024) throw new Error('Optimized model ' + id + ' remains too large for GitHub: ' + (optimizedBytes / 1024 / 1024).toFixed(1) + ' MiB');
  for (const item of await readdir(folder, { withFileTypes: true })) {
    if (item.name !== 'model.glb') await rm(path.join(folder, item.name), { recursive: true, force: true });
  }
  await writeFile(path.join(folder, 'ASSET-SOURCE.txt'), sourceNote(id) + 'Optimized: Meshopt geometry, simplified mesh, WebP textures; self-contained model.glb.\\n');
  collectionBytes += optimizedBytes;
  manifest.push({
    id,
    name: metadata.name || id,
    description: metadata.description || '',
    category: metadata.category || '',
    tags: metadata.tags || [],
    resolution,
    dependencies: 0,
    output: 'model.glb',
    optimized: true,
    sourceDependencyCount: dependencyCount,
    bytes: optimizedBytes
  });
  console.log(`Vendored ${id}: ${(totalBytes / 1024 / 1024).toFixed(2)} MiB, ${dependencyCount} dependencies`);
}

// Remove assets from the previously selected collection so Pine Forest is the only active vendored set.
const currentIds = new Set(manifest.map((asset) => asset.id));
for (const item of await readdir(root, { withFileTypes: true }).catch(() => [])) {
  if (item.isDirectory() && !currentIds.has(item.name)) {
    await rm(path.join(root, item.name), { recursive: true, force: true });
  }
}
manifest.sort((a, b) => a.id.localeCompare(b.id));
await mkdir(root, { recursive: true });
await writeFile(path.join(root, 'collection-manifest.json'), JSON.stringify({
  collection: COLLECTION,
  source: 'https://polyhaven.com/collections/pine_forest',
  format: 'GLB with Meshopt-compressed geometry and WebP textures',
  license: 'CC0',
  modelCount: manifest.length,
  models: manifest
}, null, 2) + '\n');

console.log(`Pine Forest complete: ${manifest.length} optimized models, ${(collectionBytes / 1024 / 1024).toFixed(2)} MiB total`);
