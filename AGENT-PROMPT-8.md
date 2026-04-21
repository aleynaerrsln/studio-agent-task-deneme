# İterasyon-8 — Sinonim toleransı (token overlap skoru)

> **Kullanım:** Bu dosyanın TAMAMINI mevcut Claude Code oturumuna tek mesaj olarak yapıştır.

---

## Bağlam

İterasyon-7'de token-aware context window eklendi, mesaj kalitesi netleşti. Ama outcome body'sinde **3 paraphrase warning** hâlâ üretilmeye devam ediyor:

> *"50.3@'ortanca %50.3 düşüş'" — KB "azalma" diyor, body "düşüş"*

Senin önceki rapordaki gözlem:

> *"warning = true positive mu false positive mu? Agent perspektifinden body metni iyileştirmek mantıklı ama 'azalma' yazmaya zorlamak robotvari. Çözüm adayları: token overlap skoru, subdomain synonym map, Level C LLM. İterasyon-8 için en hızlı: token overlap skoru — iki ucu ucuna, hesaplanabilir, spec'te context_match_threshold: 0.5 gibi deklaratif."*

`idea.md` rafine edildi: **"Sinonim toleransı — Token overlap skoru (Level B+)"** bölümü eklendi. Önce bu yeni bölümü oku.

---

## Bu iterasyonda yapılacaklar

### 1. Spec'i genişlet — `match_method` opsiyonel field

`src/artifacts/graphical-abstract.mjs` içindeki `spec.soft_trace_fields` her entry'sinin `context_window` objesine yeni alanlar:

```javascript
soft_trace_fields: [
  {
    path: 'panels[].body',
    severity: 'warning',
    extract_numeric_core: true,
    context_window: {
      strategy: 'tokens',
      tokens_before: 2,
      tokens_after: 2,
      match_method: 'overlap',        // YENİ — varsayılan 'substring'
      overlap_threshold: 0.5,         // YENİ
      kb_extended_radius: 5,          // YENİ — KB'de core etrafında kaç token okunsun
    },
  },
],
```

`hard_fields` (`numeric_fields`) için **dokunma** — substring matching kalsın, disiplin korunsun.

`schema_version` → `0.7` (bump).

### 2. Algoritmayı uygula — KB extended window + overlap

Yeni helper fonksiyonlar:

```javascript
function getKbExtendedWindow(kbRaw, core, radius) {
  // KB'de core'un substring olarak geçtiği YERİ bul
  const idx = kbRaw.indexOf(core);
  if (idx === -1) return null;  // core KB'de yok zaten

  // KB'yi tokenize et (whitespace-only, iterasyon-7 tokenizer)
  // Core'un hangi token'da olduğunu bul
  const tokens = tokenize(kbRaw);
  const tokenIdx = findTokenIndexContaining(tokens, core);
  if (tokenIdx === -1) return null;

  // Core etrafında radius kadar token al
  const before = Math.max(0, tokenIdx - radius);
  const after = Math.min(tokens.length, tokenIdx + 1 + radius);
  return tokens.slice(before, after);
}

function jaccardOverlap(tokens1, tokens2) {
  // Lowercase normalize, set bazlı
  const set1 = new Set(tokens1.map((t) => t.toLowerCase()));
  const set2 = new Set(tokens2.map((t) => t.toLowerCase()));
  const intersect = [...set1].filter((t) => set2.has(t));
  const union = new Set([...set1, ...set2]);
  return union.size === 0 ? 0 : intersect.length / union.size;
}

function calculateOverlapScore(adayTokens, kbExtendedTokens) {
  // Aday tokenlarının KB'deki kapsanma oranı (asymmetric)
  // veya jaccard
  if (!adayTokens.length) return 0;
  const kbSet = new Set(kbExtendedTokens.map((t) => t.toLowerCase()));
  const matched = adayTokens.filter((t) => kbSet.has(t.toLowerCase())).length;
  return matched / adayTokens.length;
}
```

### 3. Lint kuralını genişlet

`soft-fields-traceable` kuralı içinde, eğer `match_method === 'overlap'` ise:

1. Mevcut substring trace yerine overlap skoru hesapla
2. Skor < `overlap_threshold` → warning üret
3. Mesaj formatı: `core@"aday_window" overlap=0.X (KB extended: "kb_window")`

```javascript
if (field.context_window?.match_method === 'overlap') {
  const adayTokens = tokenize(item.window);
  const kbExtended = getKbExtendedWindow(
    a._kb_raw_text,
    item.core,
    field.context_window.kb_extended_radius ?? 5
  );

  if (!kbExtended) {
    // Core KB'de yok — bu zaten katman 2'de yakalandı, double warning olmasın
    continue;
  }

  const score = calculateOverlapScore(adayTokens, kbExtended);
  if (score < (field.context_window.overlap_threshold ?? 0.5)) {
    contextMismatches.push({
      core: item.core,
      window: item.window,
      score: score.toFixed(2),
      kb_window: kbExtended.join(' '),
    });
  }
}
```

`numeric_fields` için (substring match) **mevcut davranış aynı** kalır — sadece `soft_trace_fields` yeni davranışı kullanır.

### 4. Test (normal)

```bash
node bin/studio-agent.mjs compile --source knowledge-base.md --out output
```

Beklenti — bu kritik:
- Hard fields PASS (mevcut)
- **Soft warning sayısı muhtemelen düşer** (3 → 0 veya 1)
- Çünkü body'deki "düşüş" / KB'deki "azalma" — token "%50.3" ortak, overlap 0.5+ olabilir

Eğer warning'ler 0'a düşerse — hedef başarıldı (paraphrase tolere edildi).
Eğer hala 1-2 warning kalırsa — overlap skoru gerçekten düşük (KB ve body bambaşka context'ler), warning **gerçek bulgu**.

### 5. Negatif test (kritik — toleransın sınırlarını sınamak için)

Üç vaka enjekte et:

**Vaka A — Saf halüsinasyon (sayı yanlış):**
```
"Zaman 1 → Zaman 2 ortanca %999 düşüş"
```
Beklenti: core "999" KB'de yok → katman 2 (substring) FAIL → warning. Overlap aşamasına geçmez.

**Vaka B — Doğal paraphrase (sinonim, sayı doğru):**
```
"Zaman 1 → Zaman 2 ortanca %50.3 düşüş"  (orijinal body)
```
Beklenti: core "50.3" PASS. Overlap skoru hesaplanır. KB'de "%50.3 azalma" var, body "%50.3 düşüş". Token overlap: hem "%50.3" var, "düşüş" yok / "azalma" yok → overlap = 1/3 ≈ 0.33 (eğer threshold 0.5 ise FAIL → warning).

Bu **sınır vakası** — overlap_threshold ayarı kritik olduğunu gösterir.

**Vaka C — Çok yakın paraphrase (sayı + ortak kelime):**
```
"Zaman 1 → Zaman 2 ortanca değerde %50.3 düşüş"
```
"ortanca" kelimesi hem KB'de hem body'de geçer. Overlap artar (1/3 → 2/3?), threshold üstüne çıkar → silent PASS.

Üçünü de çalıştır, mesaj çıktılarını paylaş.

### 6. Karşılaştırmalı analiz

Bu iterasyon mevcut warning'leri azaltıyorsa, **kanıt için**:

| Strategy | Warning sayısı | False positive? |
|---|---|---|
| substring (eski) | 3 | Muhtemel — body paraphrase doğru |
| overlap@0.5 | ? | ? |

Bu tabloyu raporda göster.

### 7. Kısa rapor

İterasyon-8 sonunda yine kısa rapor:

- idea.md'nin yeni "Sinonim toleransı" bölümü yeterince netti mi?
- `overlap_threshold: 0.5` doğru default mu? Test sırasında 0.3 / 0.7 ile karşılaştırma yapabildin mi?
- Jaccard mı, asymmetric overlap (aday tokens'ın KB'de bulunma oranı) mı seçtin? Hangisi daha mantıklı?
- Mevcut 3 warning bu iterasyonda azaldı mı? Hangileri kaldı, hangileri PASS oldu?
- Negatif test — sınır vakası (Vaka B) doğru sınıflandı mı?
- 9. iterasyon için en kritik 1-2 muğlaklık?

### 8. Önemli not

Bu iterasyonun değer testi: **eğer mevcut paraphrase warning'leri azalırsa** sinonim toleransı işe yarıyor. Eğer azalmazsa (KB ve body context'leri çok farklı), threshold'u düşürmek değil, **agent'ın body üretim kalitesini iyileştirmek** gerekiyor (compile() içindeki buildOutcomePanel daha KB-yakın yazabilir).

Yani bu iterasyon iki veriyi birden topluyor: (a) overlap algoritması doğru çalışıyor mu, (b) mevcut paraphrase warning'leri gerçekten "false positive" mi, yoksa body üretiminin disiplinsizliği mi? Raporunda her ikisini de yorumla.

---

Başla. Önce idea.md'nin yeni bölümünü oku, sonra spec'e match_method ekle, KB extended window ve overlap helper'larını yaz, lint kuralını genişlet, hem normal hem 3 negatif test çalıştır, raporla.
