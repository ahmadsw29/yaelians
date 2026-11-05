const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const http = require('node:http');
const { once } = require('node:events');
const zlib = require('node:zlib');
const { compressWebAssets } = require('./compress-web.cjs');

const appRoot = path.resolve(__dirname, '..');
const workspaceRoot = path.resolve(appRoot, '../..');
const source = fs.readFileSync(path.join(appRoot, 'server/serve.js'), 'utf8');

test('Arabic number and date displays always use Western digits', () => {
  const ts = require('typescript');
  const module = { exports: {} };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(appRoot, 'lib/display-numbers.ts'), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText, { exports: module.exports, module, Date });
  const { toWesternDigits, formatDisplayNumber, formatDisplayDate, formatDisplayDateTime } = module.exports;
  assert.equal(toWesternDigits('\u0660\u0661\u0662\u0663\u0664\u0665\u0666\u0667\u0668\u0669'), '0123456789');
  assert.equal(toWesternDigits('\u06f0\u06f1\u06f2\u06f3\u06f4\u06f5\u06f6\u06f7\u06f8\u06f9'), '0123456789');
  assert.equal(toWesternDigits('هدفك 20 كلمة'), 'هدفك 20 كلمة');
  for (const value of [formatDisplayNumber(1234), formatDisplayNumber(48.9),
    formatDisplayDate('2026-11-05T12:34:00Z'), formatDisplayDateTime(new Date('2026-11-05T12:34:00Z'))]) {
    assert.doesNotMatch(value, /[\u0660-\u0669\u06f0-\u06f9]/);
    assert.match(value, /[0-9]/);
  }
});

test('checkout convenience preserves hosted destination and verified-state boundaries', () => {
  const ts = require('typescript');
  const module = { exports: {} };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(appRoot, 'lib/billing-flow.ts'), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText, { exports: module.exports, module, URL });
  const { hostedCheckoutUrl, billingScreenState } = module.exports;
  const url = new URL(hostedCheckoutUrl('https://whop.com/checkout/example?existing=1', 'parent+learner@example.test'));
  assert.equal(url.searchParams.get('email'), 'parent+learner@example.test');
  assert.equal(url.searchParams.get('existing'), '1');
  assert.equal(url.searchParams.has('email.disabled'), false);
  assert.equal(url.searchParams.has('email.hidden'), false);
  const fast = new URL(hostedCheckoutUrl('https://whop.com/checkout/example?existing=1&email.hidden=1', 'learner@example.test'));
  assert.equal(fast.searchParams.has('email.hidden'), false);
  assert.equal(fast.searchParams.get('email'), 'learner@example.test');
  assert.equal(fast.searchParams.has('email.disabled'), false);
  const alternate = new URL(hostedCheckoutUrl(fast.toString()));
  assert.equal(alternate.searchParams.has('email'), false);
  assert.equal(alternate.searchParams.has('email.hidden'), false);
  const unknown = new URL(hostedCheckoutUrl(fast.toString(), '  '));
  assert.equal(unknown.searchParams.has('email.hidden'), false);
  assert.equal(unknown.searchParams.has('email'), false);
  const editable = new URL(hostedCheckoutUrl(fast.toString() + '&email.disabled=1', 'parent@example.test'));
  assert.equal(editable.searchParams.get('email'), 'parent@example.test');
  assert.equal(editable.searchParams.has('email.disabled'), false);
  assert.equal(editable.searchParams.has('email.hidden'), false);
  assert.equal(hostedCheckoutUrl('https://whop.com/checkout/example'), 'https://whop.com/checkout/example');
  for (const bad of ['http://whop.com/checkout/x', 'https://whop.com.fake.test/x', 'https://fake.test/?next=whop.com', 'https://name:secret@whop.com/x', 'https://whop.com:8443/x']) {
    assert.throws(() => hostedCheckoutUrl(bad));
  }
  assert.equal(billingScreenState('inactive', false, false, true), 'pending');
  assert.equal(billingScreenState('inactive', false, false, false), 'inactive');
  assert.equal(billingScreenState('pending', false, false, false), 'pending');
  assert.equal(billingScreenState('active', false, false, true), 'active');
  assert.equal(billingScreenState('active', false, true, false), 'error');
  assert.equal(billingScreenState(undefined, false, false, false), 'error');
  assert.equal(billingScreenState(undefined, true, false, false), 'checking');
});

test('subscription forwards the payer-email choice to checkout and exposes checkbox state', () => {
  const page = fs.readFileSync(path.join(appRoot, 'app/subscribe.tsx'), 'utf8');
  const membership = fs.readFileSync(path.join(appRoot, 'components/WebMembership.tsx'), 'utf8');
  assert.match(page, /onCheckout=\{useAccountEmail => void checkout\(useAccountEmail\)\}/);
  assert.match(page, /hostedCheckoutUrl\(result\.purchaseUrl, useAccountEmail \? email : undefined\)/);
  assert.match(membership, /onPress=\{\(\) => props\.onCheckout\(useAccountEmail\)\}/);
  assert.match(membership, /aria-checked=\{useAccountEmail\}/);
});

test('web launch chrome follows light, dark and system appearance without depending on storage', () => {
  const html = fs.readFileSync(path.join(appRoot, 'public/index.html'), 'utf8');
  const bootstrap = html.match(/<script id="appearance-bootstrap">([\s\S]*?)<\/script>/)[1];
  for (const [preference, systemDark, expected] of [
    ['light', true, false], ['dark', false, true],
    ['system', true, true], ['system', false, false], [null, true, true],
  ]) {
    const metas = {};
    const root = { style: {} };
    vm.runInNewContext(bootstrap, {
      localStorage: { getItem: () => preference },
      matchMedia: () => ({ matches: systemDark }),
      document: {
        documentElement: root,
        querySelector: selector => ({ setAttribute: (_, value) => { metas[selector] = value; } }),
      },
    });
    assert.equal(root.style.backgroundColor, expected ? '#111d1b' : '#f7f4ed');
    assert.equal(root.style.colorScheme, expected ? 'dark' : 'light');
    assert.equal(metas['meta[name="apple-mobile-web-app-status-bar-style"]'], expected ? 'black-translucent' : 'default');
    assert.equal(metas['meta[name="theme-color"]'], root.style.backgroundColor);
  }
  assert.doesNotThrow(() => vm.runInNewContext(bootstrap, {
    localStorage: { getItem() { throw new Error('Storage denied'); } },
    matchMedia: () => ({ matches: false }),
    document: { documentElement: { style: {} }, querySelector: () => ({ setAttribute() {} }) },
  }));
  assert.match(html, /viewport-fit=cover/);
  assert.match(html, /id="root"/);
  assert.equal((html.match(/name="viewport"/g) || []).length, 1);
});

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
  const assetPath = '/_expo/static/js/web/entry-0123456789abcdef.js';
  fs.mkdirSync(path.dirname(path.join(web, assetPath)), { recursive: true });
  const bundle = 'console.log("YAEL browser app");\n'.repeat(200);
  fs.writeFileSync(path.join(web, assetPath), bundle);
  const compressed = await compressWebAssets(web);
  assert.ok(compressed.gzipBytes < compressed.originalBytes / 2);
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
  assert.equal(manifest.headers.get('cache-control'), 'no-cache');
  const htmlResponse = await fetch(url);
  assert.equal(htmlResponse.headers.get('cache-control'), 'no-cache');
  for (const [accept, expected] of [['gzip', 'gzip'], ['br', 'br'], ['gzip;q=0, br;q=0', undefined], ['br;q=0.1,gzip;q=1', 'gzip']]) {
    const response = await new Promise((resolve, reject) => {
      http.get(url + assetPath, { headers: { 'Accept-Encoding': accept } }, res => {
        const chunks = [];
        res.on('data', chunk => chunks.push(chunk));
        res.on('end', () => resolve({ headers: res.headers, body: Buffer.concat(chunks) }));
        res.on('error', reject);
      }).on('error', reject);
    });
    assert.equal(response.headers['content-encoding'], expected);
    assert.match(response.headers['cache-control'], /immutable/);
    assert.equal(response.headers.vary, 'Accept-Encoding');
    const decoded = expected === 'br' ? zlib.brotliDecompressSync(response.body)
      : expected === 'gzip' ? zlib.gunzipSync(response.body) : response.body;
    assert.equal(decoded.toString(), bundle);
  }
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
