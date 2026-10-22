const fs = require('node:fs/promises');
const path = require('node:path');
const zlib = require('node:zlib');
const { promisify } = require('node:util');

const gzip = promisify(zlib.gzip);
const brotli = promisify(zlib.brotliCompress);

async function compressWebAssets(root) {
  let originalBytes = 0;
  let gzipBytes = 0;
  async function visit(dir) {
    for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
      const file = path.join(dir, entry.name);
      if (entry.isDirectory()) { await visit(file); continue; }
      if (!/\.(js|css|html|json|svg|webmanifest)$/.test(entry.name)) continue;
      const source = await fs.readFile(file);
      if (source.length < 1024) continue;
      const [gz, br] = await Promise.all([
        gzip(source, { level: 9 }),
        brotli(source, { params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 5 } }),
      ]);
      await Promise.all([fs.writeFile(`${file}.gz`, gz), fs.writeFile(`${file}.br`, br)]);
      originalBytes += source.length;
      gzipBytes += gz.length;
    }
  }
  await visit(root);
  return { originalBytes, gzipBytes };
}

module.exports = { compressWebAssets };
if (require.main === module) {
  compressWebAssets(path.resolve(__dirname, '../web-build'))
    .then(result => console.log('Browser compression:', result))
    .catch(error => { console.error(error); process.exitCode = 1; });
}
