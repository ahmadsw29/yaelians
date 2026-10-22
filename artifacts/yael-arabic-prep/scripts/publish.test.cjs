const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const http = require('node:http');
const { once } = require('node:events');

const appRoot = path.resolve(__dirname, '..');
const workspaceRoot = path.resolve(appRoot, '../..');
const source = fs.readFileSync(path.join(appRoot, 'server/serve.js'), 'utf8');

test('publishing includes browser output while Git excludes it', () => {
  const deploymentIgnore = fs.readFileSync(path.join(workspaceRoot, '.replitignore'), 'utf8');
  const gitIgnore = fs.readFileSync(path.join(workspaceRoot, '.gitignore'), 'utf8');
  const rules = deploymentIgnore.split(/\r?\n/).map(line => line.trim())
    .filter(line => line && !line.startsWith('#'));
  assert.ok(!rules.some(rule => rule.includes('web-build')), 'Do not strip web-build from the production image');
  assert.ok(gitIgnore.includes('/artifacts/yael-arabic-prep/web-build/'));
});

test('packaged production server serves browsers without Expo Go', async t => {
  const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'yael-publish-test-'));
  t.after(() => fs.rmSync(fixture, { recursive: true, force: true }));
  const web = path.join(fixture, 'web-build');
  fs.mkdirSync(web);
  const html = '<!doctype html><title>YAEL browser app</title>';
  fs.writeFileSync(path.join(web, 'index.html'), html);
  fs.writeFileSync(path.join(web, 'manifest.webmanifest'), '{"display":"standalone"}');
  fs.writeFileSync(path.join(web, 'service-worker.js'), '// network only');
  let server;
  vm.runInNewContext(source, {
    __dirname: path.join(fixture, 'server'),
    process: { env: { PORT: '0' } },
    console: { log() {} },
    URL,
    require: name => name === 'http' ? {
      createServer(handler) { server = http.createServer(handler); return server; },
    } : require(name),
  });
  t.after(() => new Promise(resolve => server.close(resolve)));
  if (!server.listening) await once(server, 'listening');
  const url = `http://127.0.0.1:${server.address().port}`;
  for (const route of ['/', '/website', '/subscribe', '/billing-return']) {
    const response = await fetch(url + route, { headers: { Accept: 'text/html' } });
    assert.equal(response.status, 200, route);
    assert.equal(await response.text(), html, route);
  }
  const manifest = await fetch(url + '/manifest.webmanifest');
  assert.equal(manifest.status, 200);
  assert.match(manifest.headers.get('content-type'), /application\/manifest\+json/);
});

test('missing packaged browser output is rejected rather than showing Expo Go', () => {
  const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'yael-publish-test-'));
  try {
    assert.throws(() => vm.runInNewContext(source, {
      __dirname: path.join(fixture, 'server'),
      process: { env: {} },
      console,
      require,
    }), /Missing web build file: index.html/);
  } finally {
    fs.rmSync(fixture, { recursive: true, force: true });
  }
});
