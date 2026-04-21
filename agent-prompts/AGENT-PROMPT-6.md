# İterasyon-6 — Body içi soft-trace warning

> **Kullanım:** Bu dosyanın TAMAMINI mevcut Claude Code oturumuna tek mesaj olarak yapıştır.

---

## Bağlam

İterasyon-5'te 3-katmanlı context-aware halüsinasyon koruması kuruldu. Hard fields (`primary_number`, `key_stats`) artık şu kontrollerden geçiyor:

1. Whole string trace
2. Numeric core trace
3. Context window trace

Negatif test 3/3 doğru davranış. `medical-graphical-abstract` subdomain'i için **regülasyon-grade koruma** seviyesinde.

**Ama agent'ın senin önceki raporda işaret ettiği görünmez yüzey:**

> *"Body alanlarındaki sayısal soft-trace. idea.md (iterasyon-3'te) 'body içi sayılar best-effort warning' dedi, hiçbir iterasyonda implement edilmedi. Outcome body 'Zaman 1 → Zaman 2 ortanca %50.3 düşüş; p<0.001, r=-0.613 büyük negatif etki' içinde 4 sayı var, hepsi KB'de ama kontrol yok. Agent bir gün 'Zaman 1 → Zaman 2 ortanca %60 düşüş' yazarsa hiçbir katman yakalamaz."*

`idea.md` rafine edildi: **"Soft-trace alanlar (body warning katmanı)"** alt-bölümü `soft_trace_fields` spec genişletmesini ekledi. Önce bu yeni bölümü oku.

---

## Bu iterasyonda yapılacaklar

### 1. Spec'e `soft_trace_fields` listesi ekle

`src/artifacts/graphical-abstract.mjs` içindeki `spec` objesine:

```javascript
export const spec = {
  // ... mevcut alanlar ...
  schema_version: '0.5',  // bump
  numeric_fields: [
    // mevcut hard alanlar (değişiklik yok)
  ],
  soft_trace_fields: [    // YENİ
    {
      path: 'panels[].body',
      severity: 'warning',
      extract_numeric_core: true,
      context_window: { chars_before: 6, chars_after: 6 },
    },
  ],
};
```

### 2. Lint kuralını genişlet

Mevcut `numeric-fields-traceable` kuralı **hard fields**'a (error) bakıyor. Yeni davranış:

- Hard fields → ihlal = error (artifact REJECT)
- Soft fields → ihlal = warning (artifact PASS, ama warning loglanır)

**İki yaklaşım var, sen seç:**

**Yaklaşım A — Tek lint kuralı, severity-aware:**
Mevcut `numeric-fields-traceable` kuralı içinde hem hard hem soft fields'ı dolaş, severity'ye göre error veya warning üret.

**Yaklaşım B — İki ayrı lint kuralı:**
- `numeric-fields-traceable` (hard, error)
- `soft-fields-traceable` (soft, warning)

Yaklaşım B daha DRY-uyumlu ve test edilebilir; Yaklaşım A daha sıkı entegre ve daha az tekrar. Hangisini seçersen seç, gerekçeni raporda belirt.

**Lint runner uyumluluğu:**

`runLint()` fonksiyonu şu an warning'leri zaten destekliyor (`{ warning: '...' }` döndürüldüğünde array'e ekleniyor). Bu altyapıyı kullan — yeni runtime mantığı eklemen gerekmiyor.

### 3. Sayı çıkarma — body için heuristic

Body alanlarında sayı çıkarma **biraz farklı** olmalı, çünkü body insan-okur metin içerir:

- **Atla:** 1, 2, 3 gibi tek haneli sayılar (pozisyonel/sıralı kullanım yaygın — "Zaman 1", "Zaman 2", "Panel 3")
- **Doğrula:** 2+ haneli sayılar (50, 240, 1201)
- **Doğrula:** Ondalık sayılar (0.93, -0.613, 50.3)
- **Doğrula:** Yüzde içerenler (50.3%, %50, 23%)
- **Atla:** Yıllar (1975, 2025) — iyi heuristic değil ama denemeye değer (4 haneli ve 1900-2100 arasında)

Mevcut `extractNumericCoresWithContext()` fonksiyonunu **bir parametre ile** body modu için güncelle:

```javascript
function extractNumericCoresWithContext(s, contextWindow, options = {}) {
  const skipSingleDigits = options.skipSingleDigits ?? true;
  const skipYearLike = options.skipYearLike ?? false;
  // ... regex match ...
  // skipSingleDigits: 0/1 yerine tüm tek haneliler atlanır
  // skipYearLike: 1900-2100 arası 4-haneli sayılar atlanır
}
```

Body için: `{ skipSingleDigits: true, skipYearLike: true }`
Hard fields için: `{ skipSingleDigits: false, skipYearLike: false }` (varsayılan, mevcut davranış)

### 4. Test (normal)

```bash
node bin/studio-agent.mjs compile --source knowledge-base.md --out output
```

Beklenti:
- Lint **PASS** (artifact REJECT yok — hard fields temiz)
- **Warning'ler olabilir** — body'lerde KB'de bulunmayan sayı varsa görünür hale gelmeli

Eğer **mevcut body'lerde warning çıkarsa** bu **gerçek bir bulgu**: agent body üretirken KB-bağımsız bir sayı yazmış demek. Bu noktada ya body'yi düzelt ya kuralı gevşet.

### 5. Negatif test (kritik — bu iterasyonun değerini kanıtlamak için)

Geçici olarak **outcome body**'sine uydurma sayı enjekte et:

```javascript
"Zaman 1 → Zaman 2 ortanca %999 düşüş; p<0.001, r=-0.613 büyük negatif etki"
```

`%999` KB'de yok. Beklenti:
- Lint **PASS** (artifact REJECT yok, çünkü body soft)
- **Warning üretilsin**: `panels[].body[2]: "Zaman 1 → ... %999 düşüş ..." — soft trace FAIL: %999 KB'de yok`

Geri al (commit etme).

### 6. Çıktıyı doğrula

`output/graphical-abstract.json` içinde `_metadata.lint`:

- `errors: []` olmalı (artifact valid)
- `warnings`: ya boş (mevcut body'ler temizse) ya da warning listesi
- `rules_checked` listesinde yeni kural(lar) görünmeli

### 7. Kısa rapor

İterasyon-6 sonunda yine kısa rapor:

- idea.md'nin yeni "Soft-trace alanlar" bölümü yeterince netti mi?
- Yaklaşım A (tek kural, severity-aware) mı, B (iki ayrı kural) mı seçtin? Neden?
- Mevcut body'lerde bir warning çıktı mı? (gerçek bulgu)
- Negatif test (`%999` enjekte) warning yakaladı mı?
- skipSingleDigits ve skipYearLike heuristic'leri doğru mu, false positive/negative üretiyor mu?
- 7. iterasyon için en kritik 1-2 muğlaklık?

### 8. Hatırlatma

- `_kb_raw_text` zaten artifact içinde lint için kullanılıyor — koru.
- Soft warning'ler `interpreter_notes`'a da düşmek isteyebilir (writeback sinyali — idea.md'nin writeback bölümü). Bu opsiyonel, yapacaksan rapor et.

---

Başla. Önce idea.md'nin yeni "Soft-trace alanlar" bölümünü oku, sonra spec'e `soft_trace_fields` ekle, lint runner ile entegre et, body modu için extractor parametrize et, hem normal hem negatif test yap, raporla.
