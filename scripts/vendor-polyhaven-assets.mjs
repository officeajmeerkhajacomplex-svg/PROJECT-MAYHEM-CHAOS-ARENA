import { mkdir, writeFile } from 'node:fs/promises';
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
  await writeFile(path.join(folder, 'ASSET-SOURCE.txt'), sourceNote(id));
  collectionBytes += totalBytes;
  manifest.push({
    id,
    name: metadata.name || id,
    description: metadata.description || '',
    category: metadata.category || '',
    tags: metadata.tags || [],
    resolution,
    dependencies: dependencyCount,
    bytes: totalBytes
  });
  console.log(`Vendored ${id}: ${(totalBytes / 1024 / 1024).toFixed(2)} MiB, ${dependencyCount} dependencies`);
}

manifest.sort((a, b) => a.id.localeCompare(b.id));
await mkdir(root, { recursive: true });
await writeFile(path.join(root, 'collection-manifest.json'), JSON.stringify({
  collection: COLLECTION,
  source: 'https://polyhaven.com/collections/namaqualand',
  license: 'CC0',
  modelCount: manifest.length,
  models: manifest
}, null, 2) + '\n');

if (manifest.length !== 30) {
  console.warn(`Expected 30 Pine Forest models from the collection page; API returned ${manifest.length}. Manifest records the actual API result.`);
}
console.log(`Pine Forest complete: ${manifest.length} models, ${(collectionBytes / 1024 / 1024).toFixed(2)} MiB total`);
