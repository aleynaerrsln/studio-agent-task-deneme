#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { parseKnowledgeBase } from '../src/parser.mjs';
import {
  registry,
  getArtifact,
  listArtifacts,
} from '../src/artifacts/index.mjs';
import { renderHtml, preRenderLint } from '../src/renderer/html.mjs';

const args = parseArgs(process.argv.slice(2));
const command = args._[0] ?? 'help';

if (command === 'help' || args.help) {
  printHelp();
  process.exit(0);
}

if (command === 'list') {
  const specs = listArtifacts();
  console.log('Tanımlı artifact tipleri:\n');
  for (const s of specs) {
    console.log(`- ${s.type} (schema ${s.schema_version})`);
    console.log(`    ${s.description}`);
    console.log(`    required: ${s.input_contract.required_sections.join(', ')}`);
    console.log(`    format:   ${s.output_format}`);
    console.log(`    review:   ${s.human_in_loop}`);
    console.log('');
  }
  process.exit(0);
}

if (command === 'render') {
  const input = args.input;
  const out = args.out;
  if (!input || !out) {
    console.error('Kullanım: render --input <file.json> --out <file.html>');
    process.exit(1);
  }
  renderJsonToHtml(input, out);
  process.exit(0);
}

if (command !== 'compile') {
  console.error(`Bilinmeyen komut: ${command}`);
  printHelp();
  process.exit(1);
}

const source = args.source ?? 'knowledge-base.md';
const outDir = args.out ?? 'output';
const only = args.artifact ? [args.artifact] : Object.keys(registry);
const renderMode = args.render; // 'html' veya undefined

if (!fs.existsSync(source)) {
  console.error(`Kaynak bulunamadı: ${source}`);
  process.exit(1);
}
fs.mkdirSync(outDir, { recursive: true });

const wiki = parseKnowledgeBase(source);
console.log(
  `[studio-agent] parsed ${wiki.sections.length} H2 sections from ${source} (hash ${wiki.sourceHash})`,
);

const summary = [];

for (const type of only) {
  const mod = getArtifact(type);
  console.log(`\n[compile] ${type} (schema ${mod.spec.schema_version})`);
  const artifact = mod.compile(wiki);

  const ext = mod.spec.output_format === 'json' ? 'json' : 'md';
  const outPath = path.join(outDir, `${type}.${ext}`);
  fs.writeFileSync(outPath, artifact.rendered, 'utf8');

  const lint = artifact._meta.lint;
  console.log(
    `  -> ${outPath}  [lint ${lint.passed ? 'PASS' : 'FAIL'}, ${lint.errors.length} err, ${lint.warnings.length} warn]`,
  );
  for (const e of lint.errors) console.log(`     ERROR  [${e.rule}] ${e.message}`);
  for (const w of lint.warnings) console.log(`     WARN   [${w.rule}] ${w.message}`);

  const entry = {
    type,
    path: outPath,
    lint,
    sections_used: artifact._meta.source.sections.map((s) => s.id),
    notes: artifact._meta.interpreter_notes,
  };

  if (renderMode === 'html' && ext === 'json') {
    const htmlPath = path.join(outDir, `${type}.html`);
    const rendered = tryRenderJsonToHtml(outPath, htmlPath);
    if (rendered) entry.rendered_html = htmlPath;
    else entry.render_skipped = true;
  }

  summary.push(entry);
}

const summaryPath = path.join(outDir, 'compile-report.json');
fs.writeFileSync(
  summaryPath,
  JSON.stringify(
    {
      generated_at: new Date().toISOString(),
      source: { path: source, hash: wiki.sourceHash },
      artifacts: summary,
    },
    null,
    2,
  ),
  'utf8',
);

console.log(`\n[studio-agent] compile-report -> ${summaryPath}`);

let exitCode = 0;
for (const s of summary) {
  if (s.lint.errors.length > 0) {
    exitCode = 1;
    break;
  }
  if (s.lint.warnings.length > 0 && !s.lint.passed) {
    exitCode = 2;
  }
}

if (exitCode > 0) {
  const reason =
    exitCode === 1
      ? 'errors present'
      : 'warnings rejected by strict_lint (reject_warnings=true)';
  console.error(`\n[studio-agent] LINT FAIL — exit code ${exitCode} (${reason})`);
}
process.exit(exitCode);

function renderJsonToHtml(inputPath, outputPath) {
  const ok = tryRenderJsonToHtml(inputPath, outputPath);
  if (!ok) process.exit(1);
}

function tryRenderJsonToHtml(inputPath, outputPath) {
  if (!fs.existsSync(inputPath)) {
    console.error(`[render] Input bulunamadı: ${inputPath}`);
    return false;
  }
  const json = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
  const checks = preRenderLint(json);

  if (checks.errors.length > 0) {
    console.error(`[render] ABORTED — pre-render lint errors:`);
    for (const e of checks.errors) console.error(`  ERROR  ${e}`);
    return false;
  }
  for (const w of checks.warnings) {
    console.warn(`[render] WARN  ${w}`);
  }

  const html = renderHtml(json);
  fs.writeFileSync(outputPath, html, 'utf8');
  const kb = (Buffer.byteLength(html, 'utf8') / 1024).toFixed(1);
  console.log(`[render] ${inputPath} -> ${outputPath}  (${kb} KB)`);
  return true;
}

function parseArgs(argv) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (next === undefined || next.startsWith('--')) {
        out[key] = true;
      } else {
        out[key] = next;
        i++;
      }
    } else {
      out._.push(a);
    }
  }
  return out;
}

function printHelp() {
  console.log(`studio-agent — knowledge-base -> artifact compiler + renderer

Kullanım:
  studio-agent compile [--source <file.md>] [--out <dir>] [--artifact <type>] [--render html]
  studio-agent render --input <file.json> --out <file.html>
  studio-agent list
  studio-agent help

Varsayılanlar:
  --source  knowledge-base.md
  --out     output
  --artifact  (boş -> tüm kayıtlı tipleri üretir)
  --render  (boş -> sadece JSON; 'html' -> compile sonrası HTML de üret)

Örnek:
  node bin/studio-agent.mjs compile --source knowledge-base.md --render html
  node bin/studio-agent.mjs render --input output/graphical-abstract.json --out output/ga.html
  node bin/studio-agent.mjs list
`);
}
