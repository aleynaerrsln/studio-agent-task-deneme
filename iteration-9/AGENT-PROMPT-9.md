# İterasyon-9 — Best-match KB occurrence (regression fix)

> **Kullanım:** Bu dosyanın TAMAMINI mevcut Claude Code oturumuna tek mesaj olarak yapıştır.

---

## Bağlam

İterasyon-8'de sinonim toleransı (token overlap skoru) eklendi ama **net iyileştirme vermedi**:

- Outcome body'deki paraphrase tolere edildi (Vaka B/C başarı)
- **Population body REGRESSION verdi** — iter-7'de PASS, iter-8'de FAIL
- Warning sayısı 1 → 1 (aynı kaldı, sadece içerik değişti)

Senin önceki rapordaki kritik gözlem:

> *"Population body regression'ı first-match kuralından. '240' KB'de 20+ kez geçiyor. İlk match section 1 metadata'da (düşük overlap), section 7'deki narrative'de (yüksek overlap) olabilirdi. İterasyon-9 extension: all_matches: true spec alanıyla tüm occurrence'lar arasında max(overlap) seçmek. KB small, performans sorun değil."*

`idea.md` rafine edildi: **"Best-match KB occurrence (first-match yetersizliği)"** bölümü eklendi. Önce bu yeni bölümü oku.

---

## Bu iterasyonda yapılacaklar

### 1. Spec'e `all_matches` ve `match_selection` alanları

`src/artifacts/graphical-abstract.mjs` içindeki `spec.soft_trace_fields` her entry'sinin `context_window` objesine ekle:

```javascript
context_window: {
  strategy: 'tokens',
  tokens_before: 2,
  tokens_after: 2,
  match_method: 'overlap',
  overlap_threshold: 0.5,
  kb_extended_radius: 5,
  all_matches: true,            // YENİ — varsayılan true
  match_selection: 'best',      // YENİ — 'first' | 'best' (default 'best')
},
```

`schema_version` → `0.8` (bump).

`numeric_fields` (hard) için **dokunma** — substring match occurrence seçiminden bağımsız.

### 2. Algoritmayı güncelle — `getKbExtendedWindow` artık tüm occurrence'ları döndürsün

İterasyon-8'deki helper'ı genişlet:

```javascript
function getKbExtendedWindowsAllMatches(kbRaw, core, radius) {
  // KB'de core'un TÜM occurrence'larını bul
  const kbTokens = tokenize(kbRaw);  // iter-7 tokenizer
  const occurrences = [];

  for (let i = 0; i < kbTokens.length; i++) {
    if (cleanToken(kbTokens[i]).includes(cleanToken(core))) {
      const before = Math.max(0, i - radius);
      const after = Math.min(kbTokens.length, i + 1 + radius);
      occurrences.push({
        tokenIdx: i,
        window: kbTokens.slice(before, after),
      });
    }
  }

  return occurrences;
}
```

(`cleanToken` fonksiyonunu iterasyon-8'de eklediğin halini koru — markdown noise temizleme.)

### 3. Lint kuralında en yüksek skoru seç

`soft-fields-traceable` kuralı içinde:

```javascript
const occurrences = getKbExtendedWindowsAllMatches(kbRaw, item.core, kb_radius);

if (occurrences.length === 0) {
  // Core KB'de yok — substring layer (katman 2) zaten yakaladı
  continue;
}

// Tüm occurrence'lar için overlap hesapla, en yükseğini seç
const adayTokens = tokenize(item.window);
let bestScore = 0;
let bestKbWindow = null;

for (const occ of occurrences) {
  const score = calculateOverlapScore(adayTokens, occ.window);
  if (score > bestScore) {
    bestScore = score;
    bestKbWindow = occ.window;
  }
}

if (bestScore < overlap_threshold) {
  contextMismatches.push({
    core: item.core,
    window: item.window,
    score: bestScore.toFixed(2),
    kb_window: bestKbWindow.join(' '),
    occurrences_checked: occurrences.length,  // bonus debug bilgisi
  });
}
```

### 4. Test (normal)

```bash
node bin/studio-agent.mjs compile --source knowledge-base.md --out output
```

Beklenti — bu kritik:
- **Population body warning'i kaybolmalı** (regression çözüldü)
- Outcome body warning'i muhtemelen kalır ama düşmüş olabilir (best-match ile daha iyi occurrence seçilir)

İdeal sonuç: `0 warn` (best-match her iki body için de yumuşak yorum bulur)
Pragmatik sonuç: `1 warn` (outcome body'deki "düşüş" kelimesi gerçekten KB'nin hiçbir occurrence'ında "azalma" dışında bir şey değil — gerçek mismatch)

### 5. Karşılaştırmalı analiz tablosu (bu iterasyonun değer kanıtı)

İter-7 vs iter-8 vs iter-9 karşılaştırma:

| Body | iter-7 (substring) | iter-8 (overlap, first-match) | iter-9 (overlap, best-match) |
|---|---|---|---|
| Population "240 katılımcı..." | PASS | FAIL (regression) | PASS bekleniyor |
| Outcome "%50.3 düşüş..." | FAIL | FAIL | ? |

Bu tabloyu raporda göster — iterasyon-9'un **hangi regresyonu çözdüğünü** somut göster.

### 6. Negatif test (çözüm halüsinasyon kapısını açtı mı)

İter-8'in 3 negatif vakasını tekrar çalıştır + 1 yeni vaka:

**Vaka A — saf halüsinasyon:**
```
Body: "Zaman 1 → Zaman 2 ortanca %999 düşüş"
```
Beklenti: Yine yakalansın (substring katmanı, occurrence sayısı önemsiz)

**Vaka B & C** (sınır + yakın paraphrase): iter-8'deki gibi tolere edilmeli

**Vaka D — best-match'in açtığı potansiyel açık:**

Agent body'de uydursa: `"240 farklı doza"` (240 var, ama bu doza değil katılımcı)
- KB'de "240" geçen occurrence'lar arasında en yüksek overlap'ı veren bulunur
- Eğer KB'de "240 doz" yoksa hiçbir occurrence yüksek skor vermez
- Beklenti: warning üretilsin

Bu vakayı çalıştır — best-match'in halüsinasyon kapısını "kasıtlı" açıp açmadığını test et.

### 7. Kısa rapor

İterasyon-9 sonunda yine kısa rapor:

- idea.md'nin yeni "Best-match KB occurrence" bölümü yeterince netti mi?
- Population regression çözüldü mü?
- Outcome body warning'i hala var mı, hangi best-match KB occurrence seçildi?
- Vaka D (best-match'in açıklığı) gerçek warning ürettedi mi?
- Performans gözlemi: best-match algoritması fark edilebilir bir gecikme yaratıyor mu?
- 10. iterasyon için en kritik 1-2 muğlaklık?

### 8. Önemli not

Bu iterasyonun **net beklediği değer**: iter-8'deki regresyonu çözmek. Eğer population body PASS olursa iterasyon başarılı. Outcome body PASS olursa **bonus**.

Eğer population body hala FAIL kalırsa **gerçek bulgu**: best-match algoritmasının KB'de "240" için bulduğu en iyi window bile body context'iyle %50'den az overlap veriyor demek — bu durumda body üretiminin kendisini iyileştirmek (`buildPopulationPanel`) gerekiyor, sinonim/best-match algoritması artık çözüm değil.

---

Başla. Önce idea.md'nin yeni bölümünü oku, sonra spec'e all_matches ekle, getKbExtendedWindow'u tüm occurrence'lara genişlet, lint kuralında best-match seç, hem normal hem 4 negatif test çalıştır, karşılaştırmalı tabloyu raporla.
