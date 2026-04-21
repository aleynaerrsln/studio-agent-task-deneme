# İterasyon-2 — graphical-abstract artifact tipine pivot

> **Kullanım:** Bu dosyanın TAMAMINI kopyala, mevcut Claude Code oturumuna (ya da yeni bir Claude Code oturumuna, aynı `studio-agent-task/` dizininde) tek mesaj olarak yapıştır.

---

## Bağlam

İterasyon-1'i başarıyla tamamladın. Paket yapısı, schema disiplini, provenance ve lint katmanları yerinde. Şu an aktif paket dizininde:

- `package.json`
- `bin/studio-agent.mjs`
- `src/parser.mjs`, `src/provenance.mjs`, `src/lint.mjs`
- `src/artifacts/index.mjs`, `executive-memo.mjs`, `visual-abstract.mjs`
- `output/` (önceki iterasyon çıktıları)

İlk iterasyon snapshot'ı `iteration-1/` klasöründe saklı — dokunma.

`idea.md` rafine edildi (yeni "Pilot subdomain: medical-graphical-abstract" bölümü eklendi). Önce onu yeniden oku.

---

## Bu iterasyonda yapılacaklar

### 1. Çıkarılacaklar

- `src/artifacts/executive-memo.mjs` → **sil**
- `src/artifacts/visual-abstract.mjs` → **sil**
- Bu iki tip `src/artifacts/index.mjs` registry'sinden de **çıkar**

Sebep: idea.md'nin yeni "Pilot subdomain: medical-graphical-abstract" bölümü, ilk pilot subdomain'in tek bir artifact tipine (`graphical-abstract`) odaklanmasını söylüyor. "Bir veya iki artifact tipini gerçekten doğru yapma" disiplini gereği jenerik tipler düşürülüyor.

### 2. Eklenecek: `graphical-abstract` artifact tipi

`src/artifacts/graphical-abstract.mjs` dosyası oluştur. Format: **JAMA / Annals of Surgery (Ibrahim) 3-panel triptych visual abstract.**

#### Şema kontratı

Çıktı **JSON** formatında, renderer-agnostic (React Native, SVG, HTML herhangi biri tüketebilir):

```json
{
  "_metadata": { ...provenance + lint },
  "type": "graphical-abstract",
  "format": "jama-triptych-v1",
  "header": {
    "title": "Çalışma başlığı",
    "citation": "Yazarlar, dergi, yıl (knowledge-base'den çıkarılabiliyorsa)",
    "journal_hint": "JAMA"
  },
  "panels": [
    {
      "position": "left",
      "role": "population",
      "title": "Population",
      "primary_number": "n=240",
      "body": "max 15 kelime; kim çalışıldı, demografi",
      "icon_hint": "people | patients | cohort | ..."
    },
    {
      "position": "center",
      "role": "intervention",
      "title": "Intervention",
      "primary_number": "4 grup × 60",
      "body": "max 15 kelime; ne yapıldı / hangi karşılaştırma",
      "icon_hint": "syringe | trial | experiment | ..."
    },
    {
      "position": "right",
      "role": "outcome",
      "title": "Outcome",
      "primary_number": "-%50.3 ortanca düşüş",
      "body": "max 15 kelime; hero bulgu",
      "icon_hint": "chart-bar | down-arrow | ..."
    }
  ],
  "footer": {
    "key_stats": ["p < 0.001", "r = -0.613 büyük etki"],
    "disclaimer": "Otomatik üretildi; insan onayı önerilir."
  }
}
```

#### İnput contract

- **Required sections:** `genel-bilgiler` (Population için), `bagimli-veri-analizi` veya `bagimsiz-tek-grup-analizi` (Outcome için)
- **Prefers:** `tanimlayici-istatistikler`, `infografik-visual-abstract-icin-anahtar-mesajlar`
- **Output format:** `json`
- **Human-in-loop:** `medium-risk` (tıbbi içerik — örneklem onayı önerilir, otomatik publish edilmez)
- **Stale rules:** source.hash değişirse veya 3-panel zorunluluğu/role enum'u değişirse yeniden derleme

#### Lint kuralları (zorunlu)

`src/artifacts/graphical-abstract.mjs` içine şu lint kurallarını koy:

1. **`exactly-three-panels`** — `panels.length === 3`, aksi halde error
2. **`panel-roles-pico`** — `panels[0].role === "population"`, `panels[1].role` ∈ `{intervention, comparison}`, `panels[2].role === "outcome"`
3. **`each-panel-has-primary-number`** — her panel `primary_number` taşımalı, boş olamaz
4. **`body-max-15-words`** — her panel `body` alanı max 15 kelime, fazlası warning
5. **`primary-number-traceable`** — her `primary_number` knowledge-base.md'de **substring olarak** geçmeli (halüsinasyon koruması, AcaVibe v5 source_quote disiplinine analog). Eşleşmiyorsa error.
6. **`icon-hint-not-empty`** — her panel `icon_hint` taşımalı
7. **`header-title-present`** — `header.title` boş olamaz
8. **`required-sections-resolved`** — input contract'taki required_sections knowledge-base'de bulunmalı

### 3. Provenance

Provenance şeması iterasyon-1'deki gibi kalsın. Yalnızca `artifact_type: "graphical-abstract"` ve `schema_version: "0.1"` (yeni başlangıç).

### 4. CLI davranışı

`node bin/studio-agent.mjs compile` artık tek artifact üretecek: `output/graphical-abstract.json`. `compile-report.json` da güncellensin.

`node bin/studio-agent.mjs list` çıktısında sadece `graphical-abstract` görünmeli.

### 5. Test

`node bin/studio-agent.mjs compile --source knowledge-base.md --out output` çalıştır.

Üretilen `output/graphical-abstract.json` dosyasını **bana göster** — özellikle:
- 3 panel doğru rollerle dolduruldu mu?
- Her panel'in `primary_number`'ı knowledge-base'den gerçekten geliyor mu?
- Lint PASS mu, hangi warning'ler var?

### 6. Kısa rapor (önceki iterasyondaki gibi)

Bu iterasyonun sonunda yine kısa bir rapor ver:
- idea.md'nin yeni "Pilot subdomain" bölümü yeterince net miydi, neyi yorumlamak zorunda kaldın?
- JAMA triptych formatında neyi atlamış olabilirim (eksik gördüğün kontrat alanı)?
- Üçüncü iterasyon için hangi 1-2 muğlaklığı netleştirmem gerekir?

---

Başla. Önce idea.md'nin yeni bölümünü oku, sonra eski iki artifact'ı sil, sonra yenisini yaz, sonra test et. İterasyon-1'in disiplinini koru.
