# studio-agent-task

Tıbbi knowledge-base markdown dosyalarını JAMA-style visual abstract artifact'larına (JSON + HTML + markdown özet) çeviren bir compiler. LLM router + rule-based KB profile adapter'lar + content provenance binding disipliniyle çalışıyor.

> ⚠️ **Bu bir ön deneme.** Üretim kullanımına değil, mimari/metodoloji denemelerine yönelik. 21 iterasyon boyunca Karpathy-tarzı autoresearch loop yöntemiyle geliştirildi (`idea.md` → `agent-prompts/` → `iterations/`).

## Hızlıca

```bash
cp .env.example .env   # LLM key'leri buraya gir (opsiyonel)

# LLM mode (default) — Gemini/Groq/OpenRouter/Cloudflare cascade
node --env-file=.env bin/studio-agent.mjs compile \
  --source knowledge-base-2.md --out output --render html

# Rule-based mode (offline)
node bin/studio-agent.mjs compile \
  --source knowledge-base.md --out output --render html --mode rule-based
```

## Yapı

- `src/` — aktif kod (parser, lint, trace, renderer, kb-profiles, llm)
- `bin/studio-agent.mjs` — CLI
- `knowledge-base*.md` — test KB'leri
- `idea.md` — evrilmiş vizyon
- `agent-prompts/` — 21 iterasyon talimatı
- `iterations/` — iterasyon snapshot'ları (tarihçe)
