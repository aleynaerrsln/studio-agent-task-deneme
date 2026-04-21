#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { parseKnowledgeBase } from '../src/parser.mjs';
import {
  registry,
  getArtifact,
  listArtifacts,
} from '../src/artifacts/index.mjs';

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

if (command !== 'compile') {
  console.error(`Bilinmeyen komut: ${command}`);
  printHelp();
  process.exit(1);
}

const source = args.source ?? 'knowledge-base.md';
const outDir = args.out ?? 'output';
const only = args.artifact ? [args.artifact] : Object.keys(registry);

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

  const ext =
    mod.spec.output_format === 'json' ? 'json' : 'md';
  const outPath = path.join(outDir, `${type}.${ext}`);
  fs.writeFileSync(outPath, artifact.rendered, 'utf8');

  const lint = artifact._meta.lint;
  console.log(
    `  -> ${outPath}  [lint ${lint.passed ? 'PASS' : 'FAIL'}, ${lint.errors.length} err, ${lint.warnings.length} warn]`,
  );
  for (const e of lint.errors) console.log(`     ERROR  [${e.rule}] ${e.message}`);
  for (const w of lint.warnings) console.log(`     WARN   [${w.rule}] ${w.message}`);

  summary.push({
    type,
    path: outPath,
    lint,
    sections_used: artifact._meta.source.sections.map((s) => s.id),
    notes: artifact._meta.interpreter_notes,
  });
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
  console.log(`studio-agent — knowledge-base -> artifact compiler (iteration 1)

Kullanım:
  studio-agent compile [--source <file.md>] [--out <dir>] [--artifact <type>]
  studio-agent list
  studio-agent help

Varsayılanlar:
  --source  knowledge-base.md
  --out     output
  --artifact  (boş -> tüm kayıtlı tipleri üretir)

Örnek:
  node bin/studio-agent.mjs compile --source knowledge-base.md --out output
  node bin/studio-agent.mjs compile --artifact executive-memo
  node bin/studio-agent.mjs list
`);
}
