// Crimson Coast Cover Lab — entry program for gta6-cover-art-01 (round 3).
// Copies the offline cover-art app and its screenshots into the output
// directory and writes the dossier with the kit's buildDossier library.
// Node 22, standard library only. Deterministic: no timestamps, no random
// values, files copied in a fixed order.
import { cpSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const repoRoot = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(process.env.MAKEFUN_OUTPUT_DIR ?? '/output');

function copyTreeIfPresent(name: string): void {
  const source = join(repoRoot, name);
  const target = join(outDir, name);
  mkdirSync(target, { recursive: true });
  try {
    cpSync(source, target, { recursive: true, dereference: false });
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err;
  }
}

mkdirSync(outDir, { recursive: true });
copyTreeIfPresent('app');
copyTreeIfPresent('screenshots');

const dossier = buildDossier(outDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
  app_path_max_bytes: 1000,
});
writeFileSync(join(outDir, 'dossier.json'), dossier);
console.log(`wrote ${join(outDir, 'dossier.json')} (${dossier.length} bytes)`);
