import { cp, mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const output = path.join(root, 'dist');
await mkdir(output, { recursive: true });
await cp(path.join(root, 'public'), output, { recursive: true });
// Preserve the same resource URLs if this repository's legacy Pages build runs.
await cp(path.join(root, 'public'), path.join(output, 'curriculum-web/public'), { recursive: true });
await writeFile(path.join(output, '.nojekyll'), '');
await cp(path.join(root, '..', 'CNAME'), path.join(output, 'CNAME'));
// Only the public tree is published. Never copy server data or source materials.
const forbidden = /(?:passwordHash|"answer"\s*:|"solution"\s*:|"workedSolution"\s*:|"notes"\s*:|hiddenSlides)/;
async function audit(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) await audit(file);
    else if (/\.json$/.test(entry.name) && forbidden.test(await readFile(file, 'utf8'))) {
      throw new Error(`Private field found in public data: ${path.relative(output, file)}`);
    }
  }
}
await audit(output);
console.log('Pages artifact ready: curriculum-web/dist (public files only).');
