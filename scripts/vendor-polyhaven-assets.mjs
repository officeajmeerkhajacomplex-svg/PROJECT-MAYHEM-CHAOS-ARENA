import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

// All IDs are public Poly Haven CC0 model slugs. Keep the game asset set curated
// and use 1K glTF downloads to keep the repository and mobile build manageable.
const assetIds = [
  'island_tree_02', 'island_tree_01', 'shrub_02', 'shrub_03',
  'fern_02', 'grass_medium_02', 'grass_medium_01',
  'rock_07', 'rock_09', 'boulder_01'
];
const root = path.resolve('public/assets/polyhaven');

function safeRelative(input) {
  let normalized = String(input).split('\\\\').join('/');
  while (normalized.startsWith('/')) normalized = normalized.slice(1);
  const parts = normalized.split('/');
  if (parts.some((part) => !part || part === '.' || part === '..')) {
    throw new Error(`Unsafe Poly Haven dependency path: ${input}`);
  }
  return parts.join('/');
}

async function download(url, destination) {
  const response = await fetch(url, { headers: { 'User-Agent': 'ProjectMayhemAssetVendor/1.0' } });
  if (!response.ok) throw new Error(`Download failed (${response.status}): ${url}`);
  const bytes = new Uint8Array(await response.arrayBuffer());
  await mkdir(path.dirname(destination), { recursive: true });
  await writeFile(destination, bytes);
  return bytes.byteLength;
}

for (const id of assetIds) {
  console.log(`Fetching Poly Haven metadata: ${id}`);
  const metadataResponse = await fetch(`https://api.polyhaven.com/files/${id}`, {
    headers: { 'User-Agent': 'ProjectMayhemAssetVendor/1.0' }
  });
  if (!metadataResponse.ok) throw new Error(`Metadata failed for ${id}: ${metadataResponse.status}`);
  const files = await metadataResponse.json();
  const variants = files?.gltf || files?.modelFiles?.gltf || {};
  if (!variants || typeof variants !== 'object') {
    throw new Error(`Unexpected Poly Haven model metadata for ${id}: no glTF variants`);
  }
  const resolution = ['1k', '2k', '4k'].find((key) => variants?.[key]?.gltf?.url);
  if (!resolution) throw new Error(`No glTF model variant found for ${id}`);
  const model = variants[resolution].gltf;
  if (!model?.url) throw new Error(`Poly Haven did not provide a glTF URL for ${id}`);
  if (!model.include || typeof model.include !== 'object') {
    throw new Error(`Poly Haven did not provide the dependency manifest for ${id}`);
  }
  const folder = path.join(root, id);
  await mkdir(folder, { recursive: true });

  let totalBytes = await download(model.url, path.join(folder, 'model.gltf'));
  const dependencies = Object.entries(model.include || {});
  for (const [relative, file] of dependencies) {
    if (!file?.url) continue;
    const localPath = safeRelative(relative);
    totalBytes += await download(file.url, path.join(folder, localPath));
  }

  await writeFile(path.join(folder, 'ASSET-SOURCE.txt'),
    `Poly Haven asset: ${id}\nResolution: ${resolution}\nLicense: CC0\nSource: https://polyhaven.com/a/${id}\nDownloaded by scripts/vendor-polyhaven-assets.mjs\n`);
  console.log(`Vendored ${id}: ${(totalBytes / 1024 / 1024).toFixed(2)} MiB, ${dependencies.length} dependencies`);
}
