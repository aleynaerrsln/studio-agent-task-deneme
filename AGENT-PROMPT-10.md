# İterasyon-10 — Renderer (JSON → görsel HTML kart)

> **Kullanım:** Bu dosyanın TAMAMINI mevcut Claude Code oturumuna tek mesaj olarak yapıştır.

---

## Bağlam

İterasyon-1 ile 9 arasında pipeline mühendislik tarafını derinleştirdi: schema, lint, halüsinasyon koruma, sinonim toleransı, best-match KB occurrence. Tüm çıktı **JSON** formatında. Doktor JSON okumaz, **kart görür.**

`idea.md` rafine edildi: **"Render katmanı — JSON'dan görsel kart"** bölümü eklendi. Önce bu yeni bölümü oku.

---

## Bu iterasyonda yapılacaklar

### 1. Yeni modül — `src/renderer/html.mjs`

JSON'u alıp tek bir bağımsız HTML dosyası üretsin. Kurallar:

- **Tek dosya** — inline CSS, inline SVG icon'lar, dependency yok
- **Tarayıcıda çift-tıkla aç** — file:// protokolü ile çalışsın, server gerektirmesin
- **A4 landscape oranı** — print-friendly (CSS @page rule)
- **System font stack** — `system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`
- **Medikal nötr palet** — beyaz arka plan, koyu metin, hero metric için tek vurgu rengi (önerilen: #2563eb mavi veya #059669 yeşil)

### 2. JAMA / Ibrahim 3-panel triptych görsel düzeni

```
┌─────────────────────────────────────────────────────┐
│  HEADER:                                             │
│  - title (büyük, üstte)                              │
│  - citation (küçük, italic, alt satır)               │
│  - journal_hint (sağ üst, badge)                     │
├──────────────┬──────────────┬───────────────────────┤
│  POPULATION  │  COMPARISON  │     OUTCOME           │
│              │  /INTERVENTION│                       │
│  [icon SVG]  │  [icon SVG]  │     [icon SVG]        │
│              │              │                        │
│  ## Title    │  ## Title    │     ## Title          │
│              │              │                        │
│  ### Primary │  ### Primary │     ### Primary       │
│  ### Number  │  ### Number  │     ### Number        │
│  (büyük)     │  (büyük)     │     (vurgu rengi)     │
│              │              │                        │
│  body text   │  body text   │     body text         │
│  (küçük)     │  (küçük)     │     (küçük)           │
├──────────────┴──────────────┴───────────────────────┤
│  FOOTER: key_stats[] badge'leri yan yana             │
│  Disclaimer (en altta, gri)                          │
└─────────────────────────────────────────────────────┘
```

### 3. Icon mapping

JSON'daki `icon_hint` field'ı `string` (örn. `"patients-cohort"`, `"before-after-comparison"`, `"downward-trend"`).

Renderer **basit bir mapping** yapsın:

```javascript
const iconMap = {
  'patients-cohort': '<svg>...patients icon...</svg>',
  'before-after-comparison': '<svg>...arrows icon...</svg>',
  'downward-trend': '<svg>...trending down icon...</svg>',
  // varsayılan fallback
  'default': '<svg>...generic chart icon...</svg>',
};
```

SVG icon'ları **basit** tut (Phosphor veya Heroicons stili — minimum stroke, tek renk). 24x24 viewBox.

Bilmediğin icon_hint geldiğinde fallback kullan + console warning yaz (lint katmanı).

### 4. Lint katmanı (render-time)

Renderer JSON'u almadan önce:

```javascript
function preRenderLint(json) {
  const issues = [];
  if (json.panels?.length !== 3) issues.push('panels.length 3 olmalı');
  if (!json.header?.title) issues.push('header.title boş');
  for (const [i, p] of (json.panels ?? []).entries()) {
    if (!p.primary_number) issues.push(`panel ${i} primary_number boş`);
  }
  // JSON'un kendi lint metadata'sına bak
  if (json._metadata?.lint?.errors?.length > 0) {
    issues.push(`JSON validator errors: ${json._metadata.lint.errors.length}`);
  }
  return issues;
}
```

Eğer lint **error** varsa: render'ı **reddet**, console'a "render aborted" yazıp çık.
Eğer lint **warning** varsa: render et ama console'a uyar.

### 5. CLI entegrasyonu

`bin/studio-agent.mjs` içinde yeni komut/opsiyon:

```bash
# Mevcut compile komutu — JSON üretir (değişmez)
node bin/studio-agent.mjs compile --source knowledge-base.md

# Yeni: JSON'u render et
node bin/studio-agent.mjs render --input output/graphical-abstract.json --out output/graphical-abstract.html

# Veya: tek seferde compile + render
node bin/studio-agent.mjs compile --source knowledge-base.md --render html
```

`--render html` flag'i compile sonunda otomatik render etsin.

### 6. Test

```bash
node bin/studio-agent.mjs compile --source knowledge-base.md --render html
```

Çıktı:
- `output/graphical-abstract.json` (mevcut, değişmez)
- `output/graphical-abstract.html` (YENİ)

Tarayıcıda aç ve **bana çıktıyı paylaş** — özellikle:
- Hem HTML dosyasının kısaltılmış kaynak kodu (head + body + ilk panel kadar)
- Veya: ekran görüntüsü almak istersen, kullanıcının atması için tarayıcı yolu söyle

### 7. Schema bump

`schema_version` değişmez (artifact JSON şeması aynı). Renderer **JSON şemasından bağımsız** çalışıyor — sadece tüketici. Ama yeni paket sürümü:

`package.json` → `"version": "0.2.0"` (renderer eklenmesi minor bump)

### 8. Kısa rapor

İterasyon-10 sonunda yine kısa rapor:

- idea.md'nin "Render katmanı" bölümü yeterince netti mi?
- Icon library kararı: hangi SVG'leri kullandın, mapping nasıl?
- A4 landscape boyutu mu yoksa serbest mi tercih ettin? Neden?
- HTML dosyasının dosya boyutu kaç KB?
- Render-time lint hangi durumlarda devreye girdi?
- 11. iterasyon için en kritik 1-2 muğlaklık (görsel açıdan — örn. "outcome paneli renk dengesini bozuyor", "header çok küçük" gibi).

### 9. Önemli not

Bu iterasyon **görünür ürün hissi** ekliyor. JSON'daki tüm sayılar/metinler aynen görünmeli — renderer **transparent** olmalı, veriyi değiştirmemeli. Eğer bir alan görünmüyorsa veya yanlış görünüyorsa, sorun renderer'da, JSON'da değil.

Hocaya akşam göstereceğimiz şey: tarayıcıda 3 panelli kart + JSON'da derin lint metadata. İkisi birlikte: ürün + mühendislik kanıtı.

---

Başla. Önce idea.md'nin yeni "Render katmanı" bölümünü oku, sonra `src/renderer/html.mjs` yaz, icon mapping kur, CLI'a render opsiyonu ekle, test et, raporla.
