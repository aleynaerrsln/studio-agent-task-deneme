# İterasyon-5 — Context-aware core matching (Level B)

> **Kullanım:** Bu dosyanın TAMAMINI mevcut Claude Code oturumuna tek mesaj olarak yapıştır.

---

## Bağlam

İterasyon-4'te iki katmanlı doğrulama (whole + core) eklendi ve **3 halüsinasyon vakası** yakalandı. En öğretici vaka:

> *"`süre = 12 ay` aday: core `12` substring olarak KB'de var (yanlışlıkla `120.5` içinde geçiyor) → first-line defense aldatıldı. İkinci katman (compound trace) yakaladı."*

Bu, **sayının yanlış bağlamda substring olarak geçtiği** gizli kanaldır. Compound trace ikinci güvenlik ağı olarak kurtardı, ama core seviyesinde **context awareness eksikliği bir mimari açık.**

Senin dediğin gibi:
> *"Şu an `240` substring match ile PASS verir ama aynı kontekstte mi geçiyor? sorusu yanıtlanamaz. Gerçek çözüm context_window — core'un etrafındaki 5-10 karakter de KB'de olmalı."*

`idea.md` rafine edildi: **"Context-aware core matching (Level B'ye yaklaşım)"** alt-bölümü `context_window` spec genişletmesini ekledi. Önce bu yeni bölümü oku.

---

## Bu iterasyonda yapılacaklar

### 1. Spec'i genişlet — `context_window` opsiyonel field

`src/artifacts/graphical-abstract.mjs` içindeki `spec.numeric_fields` her entry'sine `context_window` ekle:

```javascript
numeric_fields: [
  {
    path: 'panels[].primary_number',
    required: true,
    extract_numeric_core: true,
    context_window: { chars_before: 6, chars_after: 6 },
  },
  {
    path: 'footer.key_stats[]',
    required: true,
    extract_numeric_core: true,
    context_window: { chars_before: 6, chars_after: 6 },
  },
],

trace_level: 'B',  // YENİ — A'dan B'ye terfi (Level A + context window)
```

`schema_version` → `0.4` (bump).

### 2. Context window extractor

Mevcut `extractNumericCores()` fonksiyonunu genişlet — sadece core'u değil, core'un index'ini ve etrafındaki window'u da döndürsün:

```javascript
function extractNumericCoresWithContext(s, contextWindow) {
  const re = /-?\d+\.?\d*%?/g;
  const result = [];
  let m;
  while ((m = re.exec(s)) !== null) {
    const core = m[0];
    const numeric = core.replace('%', '').replace('-', '');
    if (numeric.length <= 1 && (numeric === '0' || numeric === '1')) continue;

    const start = Math.max(0, m.index - (contextWindow?.chars_before ?? 0));
    const end = Math.min(s.length, m.index + core.length + (contextWindow?.chars_after ?? 0));
    const window = s.slice(start, end);

    result.push({ core, index: m.index, window });
  }
  return result;
}
```

### 3. Lint kuralını üç katmanlı doğrulamayla güçlendir

`numeric-fields-traceable` kuralı şu şekilde davranmalı:

```javascript
{
  id: 'numeric-fields-traceable',
  check: (a) => {
    const kbNorm = normalizeForTrace(a._kb_raw_text ?? '');
    if (!kbNorm) return { error: 'knowledge-base ham metni sağlanmadı' };

    const errors = [];
    const warnings = [];

    for (const field of spec.numeric_fields) {
      const values = collectValuesAtPath(a.payload, field.path);
      for (const v of values) {
        if (!v || !String(v).trim()) continue;

        // Katman 1: bütün string trace
        const wholeMatch = kbNorm.includes(normalizeForTrace(v));

        // Katman 2 + 3: core ve context
        const coreFailures = [];
        const contextMismatches = [];

        if (field.extract_numeric_core) {
          const items = extractNumericCoresWithContext(v, field.context_window);
          for (const item of items) {
            // Katman 2: core substring trace
            const coreFound = kbNorm.includes(normalizeForTrace(item.core));
            if (!coreFound) {
              coreFailures.push(item.core);
              continue;
            }

            // Katman 3: context window trace (sadece core PASS olduysa kontrol)
            if (field.context_window) {
              const windowFound = kbNorm.includes(normalizeForTrace(item.window));
              if (!windowFound) {
                contextMismatches.push({ core: item.core, window: item.window });
              }
            }
          }
        }

        // Karar mantığı:
        // - whole PASS + tüm core PASS + tüm context PASS → onay
        // - context mismatch varsa → REJECT (strict mode, medikal alan)
        // - core FAIL varsa → REJECT
        // - whole FAIL ama tüm core+context PASS → onay (compound formatlama farklı olabilir)

        if (coreFailures.length > 0) {
          errors.push(
            `${field.path}: "${v}" — core trace FAIL [${coreFailures.join(', ')}]`
          );
        } else if (contextMismatches.length > 0) {
          errors.push(
            `${field.path}: "${v}" — context window mismatch [${contextMismatches.map((c) => `${c.core}@"${c.window}"`).join(', ')}] (core KB'de var ama yanlış bağlamda)`
          );
        } else if (!wholeMatch && !field.extract_numeric_core) {
          errors.push(`${field.path}: "${v}" — whole string trace FAIL`);
        }
      }
    }

    return errors.length === 0 || { error: errors.join('; ') };
  },
}
```

### 4. Test (normal)

```bash
node bin/studio-agent.mjs compile --source knowledge-base.md --out output
```

Beklenti: Lint PASS — mevcut payload'daki tüm primary_number ve key_stats'lar doğru context'te KB'de geçiyor olmalı (n=240 doğru context, %50.3 azalma doğru context, vs.).

**Eğer beklenmedik bir alan FAIL verirse** (örn. mevcut bir primary_number'ın window'u KB'de bulunamazsa), bu **gerçek bir bulgudur** — context window'un boyutunu (`chars_before`/`chars_after`) ayarlamamız gerekebilir.

### 5. Negatif test (kritik — bu iterasyonun değerini kanıtlamak için)

Üç farklı vaka enjekte et ve lint çıktısını paylaş:

**Vaka A — context mismatch (asıl yakalanması gereken):**
```javascript
"süre = 12 ay"  // core "12" KB'de "120.5" içinde substring var ama "süre = 12 ay" context'inde yok
```
Beklenti: katman 2 (core) PASS ama katman 3 (context) FAIL → REJECT

**Vaka B — saf halüsinasyon:**
```javascript
"n = 999"  // core "999" KB'de yok
```
Beklenti: katman 2 (core) FAIL → REJECT

**Vaka C — gerçek pozitif (negatif test'in negatif test'i):**
```javascript
"n = 240"  // core "240" KB'de var, context "n = 240" KB'de var
```
Beklenti: PASS

Her üç vakanın lint çıktısını paylaş.

### 6. Kısa rapor

İterasyon-5 sonunda yine kısa rapor:

- idea.md'nin yeni "Context-aware core matching" bölümü yeterince netti mi?
- `context_window: { chars_before, chars_after }` doğru tasarım mı, yoksa token-aware (kelime sınırı bazlı) daha iyi olur mu?
- Negatif test gerçekten context mismatch yakaladı mı? (Vaka A)
- Gerçek payload'daki bir alan beklenmedik şekilde FAIL verdi mi? (window boyutu ayarı gerekiyorsa söyle)
- 6. iterasyon için en kritik 1-2 muğlaklık?

### 7. Önemli not

Mevcut payload'daki tüm primary_number ve key_stats değerleri, knowledge-base.md'de **literal olarak doğru context'te** geçiyor (örn. KB section 7'de "%50.3 azalma" diye geçiyor). Bu yüzden normal CLI çağrısının PASS olmasını bekliyoruz. Eğer **gerçek payload'da bir alan FAIL verirse** — bu bizim için değerli geri bildirim, demek ki window boyutu fazla geniş veya format farkı var. Bunu tespit edip raporla.

---

Başla. Önce idea.md'nin yeni bölümünü oku, sonra spec'i genişlet, extractor'ı window-aware hale getir, lint kuralını üçüncü katmanla güçlendir, hem normal hem negatif test yap, raporla.
