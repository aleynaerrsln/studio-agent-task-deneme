# İterasyon-3 — Halüsinasyon kapısını kapatma

> **Kullanım:** Bu dosyanın TAMAMINI mevcut Claude Code oturumuna tek mesaj olarak yapıştır.

---

## Bağlam

İterasyon-2 başarıyla tamamlandı: `graphical-abstract` artifact tipi JAMA triptych formatında, 8 lint kuralından PASS geçerek üretiliyor. Aktif paket dizini sağlam, `iteration-2/` snapshot saklı.

Senin önceki rapordaki **kritik bulgun**:

> *"primary_number KB'de substring olarak aranıyor ama footer.key_stats için aynı kural yok — halüsinasyon kapısı burada açık kalıyor."*

Ayrıca: trace seviyesi (a / b / c) idea.md'de netleştirilmemişti, sen pragmatik (a) seçtin ama spec sahip değildi.

`idea.md` rafine edildi: **"Numerik trace disiplini (halüsinasyon kapısı kapatma)"** alt-bölümü eklendi. Önce bu yeni bölümü yeniden oku.

---

## Bu iterasyonda yapılacaklar

### 1. idea.md'nin yeni bölümünü uygula

**Trace algoritması Level A** (whitespace-normalized substring) kod tabanında zaten var. Yeni iş: spec'te declarative hale getir + tüm numeric fields'a uygula.

### 2. `graphical-abstract` spec'ine `numeric_fields` listesi ekle

`src/artifacts/graphical-abstract.mjs` içindeki `spec` objesine yeni alan:

```javascript
export const spec = {
  type: 'graphical-abstract',
  schema_version: '0.2',  // bump — schema değişti
  subdomain: 'medical-graphical-abstract',
  format: 'jama-triptych-v1',
  trace_level: 'A',  // YENİ — whitespace-normalized substring
  numeric_fields: [   // YENİ — trace zorunlu olan tüm yollar
    { path: 'panels[].primary_number', required: true },
    { path: 'footer.key_stats[]', required: true },
  ],
  // ... geri kalan alanlar aynı
};
```

### 3. Lint kuralını genelleştir — DRY

Mevcut `primary-number-traceable` kuralını sil. Yerine **tek bir genel kural** ekle:

```javascript
{
  id: 'numeric-fields-traceable',
  check: (a) => {
    const kbNorm = normalizeForTrace(a._kb_raw_text ?? '');
    if (!kbNorm) return { error: 'knowledge-base ham metni sağlanmadı' };

    const misses = [];
    for (const field of spec.numeric_fields) {
      const values = collectValuesAtPath(a.payload, field.path);
      for (const v of values) {
        if (!v || !String(v).trim()) continue;
        const needle = normalizeForTrace(v);
        if (!kbNorm.includes(needle)) {
          misses.push(`${field.path}: "${v}"`);
        }
      }
    }
    return misses.length === 0 || {
      error: `Numerik alan(lar) knowledge-base'de bulunamadı: ${misses.join('; ')}`,
    };
  },
}
```

`collectValuesAtPath()` küçük bir helper olacak — `panels[].primary_number` gibi bir path string'ini alıp tüm değerleri toplayacak. Footer için `footer.key_stats[]` path'i tüm array elemanlarını dolaşacak.

### 4. compile() fonksiyonunda — footer.key_stats üretimini düzgün yap

Şu anki `buildKeyStats()` fonksiyonu kendisi muhtemelen string'leri "Cohen's d = 4.186 (cov1)" gibi formatlıyor. Bu **knowledge-base'de literal olarak yok** (KB'de "4.186" var ama "Cohen's d = 4.186" tek string olarak yok).

İki seçenek:
- **(a)** `buildKeyStats()` çıktısını sadece sayısal kısımları içerecek şekilde sadeleştir: `["p < 0.001", "r = -0.613", "Cohen's d = 4.186"]` → KB'de bu üçü de geçiyor mu test et, geçmeyenleri çıkar
- **(b)** `buildKeyStats()`'in ürettiği her string için **bileşen-bileşen** trace doğrula (yani string içindeki her sayıyı ayrı doğrula)

**Tercih (a)** — daha temiz, lint-uyumlu. `buildKeyStats()` her string'i KB'de literal olarak (whitespace-normalized) geçecek şekilde inşa etmeli. Eğer KB'de yoksa o string'i array'e ekleme.

### 5. Test

```bash
node bin/studio-agent.mjs compile --source knowledge-base.md --out output
```

Beklenti:
- Lint **PASS** (8 kural — eski `primary-number-traceable` çıktı, yerine yeni `numeric-fields-traceable` geldi)
- `output/graphical-abstract.json` üretilsin
- `_metadata.lint.rules_checked` listesinde yeni kural görünsün
- `_metadata.schema_version` artık `0.2`

### 6. Kısa rapor

İterasyon-3 sonunda yine kısa rapor:

- idea.md'nin yeni "Numerik trace disiplini" bölümü yeterince netti mi?
- `numeric_fields` listesi declarative bir spec olarak doğru tasarlandı mı, yoksa spec şeması daha derinleşmeli mi?
- 4. iterasyon için en kritik 1-2 muğlaklık ne?
- Bu iterasyonda gerçekten yakaladığın halüsinasyon vakası oldu mu? (footer.key_stats'taki bir sayı KB'de yoksa, lint reddetti mi?)

### 7. Hatırlatma

- `_kb_raw_text` zaten artifact içinde geçiyor (lint için), serialize'a girmemeli — mevcut kod bunu yapıyor, koru.
- Eğer footer.key_stats üretiminde bir string'i çıkarmak zorunda kalırsan, bunu `interpreter_notes`'a not düş — bu writeback sinyali (idea.md'nin "writeback" bölümüne uygun).

---

Başla. Önce `idea.md`'nin yeni bölümünü oku, sonra spec'i güncelle, lint kuralını genelleştir, footer üretimini disipline et, test et.
