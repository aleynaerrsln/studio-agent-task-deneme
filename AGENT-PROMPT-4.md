# İterasyon-4 — Multi-value string parçalı trace

> **Kullanım:** Bu dosyanın TAMAMINI mevcut Claude Code oturumuna tek mesaj olarak yapıştır.

---

## Bağlam

İterasyon-3'te halüsinasyon kapısını kapattın: `numeric-fields-traceable` lint kuralı tüm `panels[].primary_number` ve `footer.key_stats[]` alanlarını DRY şekilde doğruluyor. 8/8 lint PASS. İki halüsinasyon vakası kanıtlı şekilde yakalandı.

Senin önceki rapordaki **kritik bulgun**:

> *"`r = -0.613 büyük etki` normalize edilmiş `r=-0.613büyüketki` olarak aranıyor. KB'de contiguous değilse FAIL. Bir string'in sayısal çekirdeğini (-0.613) + açıklayıcı kelimesini ayrı doğrulamak daha doğru olur. ... `n = 240, süre = 12 ay` — '240' ve '12' KB'de ayrı yerlerde geçiyorsa bütün ifade traceable gibi görünür. Bu gelecek için önemli bir risk."*

`idea.md` rafine edildi: **"Multi-value string parçalı trace"** alt-bölümü `extract_numeric_core` spec genişletmesini ekledi. Önce bu yeni bölümü oku.

---

## Bu iterasyonda yapılacaklar

### 1. Spec'i genişlet — `extract_numeric_core` opsiyonel field

`src/artifacts/graphical-abstract.mjs` içindeki `spec.numeric_fields` her entry'sine `extract_numeric_core: true` ekle:

```javascript
numeric_fields: [
  { path: 'panels[].primary_number', required: true, extract_numeric_core: true },
  { path: 'footer.key_stats[]', required: true, extract_numeric_core: true },
],
```

`schema_version` → `0.3` (bump).

### 2. Sayısal çekirdek extractor

Yeni bir helper:

```javascript
function extractNumericCores(s) {
  // Default regex: sayı, opsiyonel ondalık, opsiyonel %
  // Tek haneli 0/1 false positive — atla
  const re = /-?\d+\.?\d*%?/g;
  const matches = String(s ?? '').match(re) || [];
  return matches.filter((m) => {
    // Tek haneli 0 ve 1'i atla (KB'de defalarca geçer, false positive)
    const numeric = m.replace('%', '').replace('-', '');
    if (numeric.length <= 1 && (numeric === '0' || numeric === '1')) return false;
    return true;
  });
}
```

### 3. Lint kuralını iki katmanlı doğrulamayla güçlendir

`numeric-fields-traceable` kuralı şu şekilde davranmalı:

```javascript
{
  id: 'numeric-fields-traceable',
  check: (a) => {
    const kbNorm = normalizeForTrace(a._kb_raw_text ?? '');
    if (!kbNorm) return { error: 'knowledge-base ham metni sağlanmadı' };

    const errors = [];

    for (const field of spec.numeric_fields) {
      const values = collectValuesAtPath(a.payload, field.path);
      for (const v of values) {
        if (!v || !String(v).trim()) continue;

        // Katman 1: bütün string trace
        const wholeNeedle = normalizeForTrace(v);
        const wholeMatch = kbNorm.includes(wholeNeedle);

        // Katman 2: sayısal çekirdek trace (eğer extract_numeric_core)
        let coreFailures = [];
        if (field.extract_numeric_core) {
          const cores = extractNumericCores(v);
          for (const core of cores) {
            const coreNeedle = normalizeForTrace(core);
            if (!kbNorm.includes(coreNeedle)) {
              coreFailures.push(core);
            }
          }
        }

        if (!wholeMatch && coreFailures.length === 0) {
          errors.push(`${field.path}: bütün string "${v}" KB'de yok (sayısal çekirdek bulunamadı veya extract devre dışı)`);
        } else if (!wholeMatch && coreFailures.length) {
          errors.push(`${field.path}: bütün string "${v}" trace FAIL, ayrıca sayısal çekirdek FAIL [${coreFailures.join(', ')}]`);
        } else if (wholeMatch && coreFailures.length) {
          errors.push(
            `${field.path}: "${v}" — bütün string PASS ama sayısal çekirdek FAIL [${coreFailures.join(', ')}] (compound string KB'de literal var ama içindeki bazı sayılar KB'de yok)`
          );
        }
      }
    }

    return errors.length === 0 || { error: errors.join('; ') };
  },
}
```

### 4. Test

```bash
node bin/studio-agent.mjs compile --source knowledge-base.md --out output
```

Beklenti:
- Lint PASS — mevcut payload zaten temiz olmalı (iterasyon-3'te footer disipline edildi)
- `_metadata.lint.rules_checked` aynı `numeric-fields-traceable` ama davranış güçlenmiş

### 5. Negatif test (kritik — bu iterasyonun değerini kanıtlamak için)

Manuel olarak bir compound halüsinasyon enjekte et ve lint'in yakaladığını **göster**:

`compile()` içindeki bir panele veya `buildKeyStats()` çıkışına geçici olarak şu string'i ekle:
```javascript
"n = 240, süre = 999 ay"
```

`240` KB'de var, `999` KB'de yok. **Bütün string KB'de literal yok** zaten (mevcut kontrol bunu yakalar) — ama daha tehlikeli senaryo:

```javascript
"n = 240, süre = 12 ay"
```

`240` KB'de var, `12` KB'de hangi bağlamda? KB section 4 ortancada "12.588" gibi sayılar olabilir ama "12 ay" olarak yok. Bu compound string KB'de literal olarak yok → bütün string trace FAIL → mevcut kontrol zaten yakalar.

**Asıl ilginç senaryo:** KB'de literal olarak geçen ama parçaları farklı yerlerde olan bir string. Örneğin:
```javascript
"Q1 60.75 Q3 180.25"
```
KB section 2.1'de bu literal geçiyor. Ama eğer "Q1 60.75 Q3 999.99" yazsan, bütün string FAIL ama "60.75" PASS. Yeni sistem bunu nasıl ayırt eder?

**Test et:** `compile()` içine geçici olarak bu compound + bozulmuş veriyi enjekte et, lint çıktısını paylaş, sonra geri al (commit etme).

### 6. Kısa rapor

İterasyon-4 sonunda yine kısa rapor:

- idea.md'nin yeni "Multi-value string parçalı trace" bölümü yeterince netti mi?
- `extract_numeric_core` spec field'ı doğru tasarlandı mı?
- Negatif test gerçekten bir compound halüsinasyon yakaladı mı? (Hangi vaka, hangi mesaj?)
- Tek haneli 0/1 atlama heuristic'i doğru mu, yoksa false negative üretiyor mu?
- 5. iterasyon için en kritik 1-2 muğlaklık?

---

Başla. Önce idea.md'nin yeni bölümünü oku, sonra spec'i genişlet, extractor'ı yaz, lint kuralını güçlendir, negatif testle kanıtla, geri al, raporla.
