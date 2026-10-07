/**
 * reportToJira.ts
 * Postea un resumen de los resultados de Playwright en un ticket de Jira.
 *
 * Uso:
 *   npx ts-node scripts/reportToJira.ts POL-123
 *
 * Variables de entorno necesarias (crear .env.jira o exportar en la terminal):
 *   JIRA_BASE_URL   → https://tu-empresa.atlassian.net
 *   JIRA_EMAIL      → tu-email@empresa.com
 *   JIRA_API_TOKEN  → token generado en https://id.atlassian.com/manage-profile/security/api-tokens
 */

import * as fs from 'fs';
import * as https from 'https';
import * as path from 'path';

// ─── Configuración ────────────────────────────────────────────────────────────

const JIRA_BASE_URL = process.env.JIRA_BASE_URL?.replace(/\/$/, '');
const JIRA_EMAIL    = process.env.JIRA_EMAIL;
const JIRA_API_TOKEN = process.env.JIRA_API_TOKEN;
const ISSUE_KEY     = process.argv[2]; // e.g. POL-123

if (!JIRA_BASE_URL || !JIRA_EMAIL || !JIRA_API_TOKEN) {
  console.error('❌ Faltan variables de entorno: JIRA_BASE_URL, JIRA_EMAIL, JIRA_API_TOKEN');
  process.exit(1);
}
if (!ISSUE_KEY) {
  console.error('❌ Uso: npx ts-node scripts/reportToJira.ts <ISSUE_KEY>  (ej: POL-123)');
  process.exit(1);
}

// ─── Leer resultados de Playwright ────────────────────────────────────────────

const resultsPath = path.join(__dirname, '..', 'playwright-report', 'results.json');
if (!fs.existsSync(resultsPath)) {
  console.error('❌ No se encontró test-results.json. Ejecutá los tests primero.');
  process.exit(1);
}

const results = JSON.parse(fs.readFileSync(resultsPath, 'utf-8'));

interface TestCase {
  title: string;
  status: string;
  duration: number;
  file: string;
}

// Agrupa tests por archivo/suite
const suiteMap = new Map<string, TestCase[]>();

function collectTests(suite: any, fileName: string) {
  for (const spec of suite.specs ?? []) {
    for (const test of spec.tests ?? []) {
      const tc: TestCase = {
        title: spec.title,
        status: test.status,
        duration: test.results?.reduce((acc: number, r: any) => acc + (r.duration ?? 0), 0) ?? 0,
        file: fileName,
      };
      if (!suiteMap.has(fileName)) suiteMap.set(fileName, []);
      suiteMap.get(fileName)!.push(tc);
    }
  }
  for (const child of suite.suites ?? []) {
    collectTests(child, fileName);
  }
}

for (const suite of results.suites ?? []) {
  const fileName = suite.title ?? 'unknown';
  collectTests(suite, fileName);
}

const allTests = Array.from(suiteMap.values()).flat();
const passed  = allTests.filter(t => t.status === 'expected').length;
const failed  = allTests.filter(t => t.status === 'unexpected').length;
const flaky   = allTests.filter(t => t.status === 'flaky').length;
const skipped = allTests.filter(t => t.status === 'skipped').length;
const total   = allTests.length;

const durationMs  = results.stats?.duration ?? 0;
const durationMin = (durationMs / 60000).toFixed(1);
const date        = new Date().toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' });

// ─── Armar comentario en Jira Wiki Markup ─────────────────────────────────────

const statusIcon = failed > 0 ? '🔴' : flaky > 0 ? '🟡' : '🟢';
const statusText = failed > 0 ? 'FALLARON TESTS' : flaky > 0 ? 'TESTS INESTABLES' : 'TODOS PASARON';

function statusLabel(status: string): string {
  switch (status) {
    case 'expected':   return '(/) Pasó';
    case 'unexpected': return '(x) Falló';
    case 'flaky':      return '(!) Inestable';
    case 'skipped':    return '(-) Salteado';
    default:           return status;
  }
}

function formatDuration(ms: number): string {
  if (ms >= 60000) return `${(ms / 60000).toFixed(1)}m`;
  return `${(ms / 1000).toFixed(1)}s`;
}

let comment = `h2. ${statusIcon} Reporte de Tests Automáticos — ${statusText}

*Fecha:* ${date} | *Duración total:* ${durationMin} min

|| ✅ Pasaron || ❌ Fallaron || ⚠️ Inestables || ⏭ Salteados || Total ||
| *${passed}* | *${failed}* | *${flaky}* | *${skipped}* | *${total}* |

`;

// Detalle por archivo
for (const [fileName, tests] of suiteMap.entries()) {
  comment += `h4. 📄 ${fileName}\n`;
  comment += `|| Estado || Test || Duración ||\n`;
  for (const t of tests) {
    comment += `| ${statusLabel(t.status)} | ${t.title} | ${formatDuration(t.duration)} |\n`;
  }
  comment += '\n';
}

if (failed === 0 && flaky === 0) {
  comment += `✅ Todos los tests pasaron correctamente.`;
}

// ─── Postear a Jira ───────────────────────────────────────────────────────────

const body = JSON.stringify({
  body: comment,
});

const auth = Buffer.from(`${JIRA_EMAIL}:${JIRA_API_TOKEN}`).toString('base64');
const url  = new URL(`${JIRA_BASE_URL}/rest/api/2/issue/${ISSUE_KEY}/comment`);

const options: https.RequestOptions = {
  hostname: url.hostname,
  path:     url.pathname,
  method:   'POST',
  headers: {
    'Authorization': `Basic ${auth}`,
    'Content-Type':  'application/json',
    'Content-Length': Buffer.byteLength(body),
  },
};

console.log(`\n📤 Posteando resultados en ${ISSUE_KEY}...`);

const req = https.request(options, (res) => {
  let data = '';
  res.on('data', chunk => { data += chunk; });
  res.on('end', () => {
    if (res.statusCode === 201) {
      console.log(`✅ Comentario posteado en ${JIRA_BASE_URL}/browse/${ISSUE_KEY}`);
      console.log(`   ${passed} pasaron · ${failed} fallaron · ${flaky} flaky · ${total} total`);
    } else {
      console.error(`❌ Error ${res.statusCode}: ${data}`);
    }
  });
});

req.on('error', (e) => {
  console.error('❌ Error de conexión:', e.message);
});

req.write(body);
req.end();
