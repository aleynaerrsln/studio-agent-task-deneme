# İterasyon-12 — Outcome body sadeleştirme (FAIL'i çöz)

> **Kullanım:** Bu dosyanın TAMAMINI mevcut Claude Code oturumuna tek mesaj olarak yapıştır.

---

## Bağlam

İterasyon-11'de lint sertleştirildi. Şu an paket FAIL durumunda (exit 2):

```
panels[].body: "Zaman 1 → Zaman 2 ortanca %50.3 düşüş; p<0.001, r=-0.613 büyük negatif etki"
  - 50.3@... best_overlap=0.40 (best of 4 KB occurrences)
  - 0.001@... best_overlap=0.20
  - -0.613@... best_overlap=0.40
```

Outcome body 3 farklı KB section'undan veri sentezi yapıyor → hiçbir tek occurrence overlap_threshold'u (0.5) geçmiyor.

ChatGPT eleştirisi de aynı yöne işaret ediyor:

> *"%50.3 düşüş; p<0.001, r=-0.613 büyük negatif etki — bu 1 panel için fazla bilgi. JAMA'da bu kadar packed olmaz."*

`idea.md` rafine edildi: **"Body üretim disiplini — JAMA standardı + lint uyumu"** bölümü eklendi. Önce bu yeni bölümü oku.

---

## Bu iterasyonda yapılacaklar

### 1. Outcome body sadeleştir

`src/artifacts/graphical-abstract.mjs` içindeki `buildOutcomePanel()` fonksiyonunu güncelle:

**Mevcut (FAIL veriyor):**
```javascript
body = "Zaman 1 → Zaman 2 ortanca %50.3 düşüş; p<0.001, r=-0.613 büyük negatif etki"
```

**Yeni hedef (KB-yakın, sade, lint PASS):**
```javascript
body = "Zaman 1'den Zaman 2'ye ortanca değer %50.3 azalmış"
// KB section 7 literal: "Zaman 1→2 arasında ortanca değerde %50.3 azalma"
// veya: "Dramatik Düşüş: Zaman 1→2 arasında ortanca değerde %50.3 azalma"
```

Önemli: istatistikler (p, r, d) artık body'de **tekrarlanmaz** — zaten footer.key_stats'ta var.

### 2. Population ve Comparison body'lerini de gözden geçir

İdeal: ikisi de KB-yakın olsun. Mevcut warning vermiyorlar ama disiplin tutarlı olmalı.

```javascript
// Population — mevcut zaten iyi:
body = "240 katılımcı, 4 eşit gruba (G1–G4) dengeli dağıtıldı"
// Bu KB section 1 + section 2.2'den. Şu an PASS, dokunma.

// Comparison — biraz uzun:
body = "Bağımlı iki ölçüm (Zaman 1 vs Zaman 2) Wilcoxon İşaretli Sıralar Testi ile karşılaştırıldı"
// 14 kelime, body_max_15_words limitinde. Sadeleştir:
body = "Wilcoxon ile bağımlı iki ölçüm karşılaştırıldı"
// veya KB section 4'e daha yakın:
body = "Bağımlı iki ölçüm Wilcoxon İşaretli Sıralar Testi ile karşılaştırıldı"
```

Comparison için lint zaten PASS olabilir (current overlap iyi), test ederek karar ver.

### 3. Test (kritik — paket PASS dönmeli)

```bash
node bin/studio-agent.mjs compile --source knowledge-base.md --out output --render html
```

Beklenti:
- `[lint PASS, 0 err, 0 warn]`
- Exit code: 0
- HTML render başarılı
- HTML dosyası güncellendi

Eğer hala warning varsa:
- Lint mesajını oku, hangi core fail ediyor
- Body'yi o core'un KB occurrence'ına daha yakın yaz
- Tekrar test et

### 4. Görsel doğrulama

HTML'i tarayıcıda aç (`output\graphical-abstract.html`) ve kontrol et:

- Outcome panel daha temiz mi (3 yerine 1 mesaj)?
- Body 1 satıra düştü mü? (Önceden 2 satırdı, sade hali 1 satır olmalı)
- Footer'daki istatistikler hala görünür mü?
- Genel görsel denge iyileşti mi?

### 5. KB-yakın yazma kararının yan etkileri

Bu iterasyon body üretimini KB-bağımlı yaptı. Risk:

- **Pozitif:** Lint PASS, paraphrase warning'leri kayboldu, JAMA standardı netleşti
- **Negatif:** Body biraz "robotik" — KB'nin cümlelerini kopyalıyor, kendi cümle kurmuyor. Hocan "yapay zeka kelime değiştiremiyor mu?" diye sorabilir.

Bu trade-off'u kabul ettik. İterasyon-12 amacı: lint disiplini + JAMA sade format. Stilistik özgünlük sonra düşünülür.

### 6. Schema bump

Şema **değişmedi**, sadece body üretim mantığı değişti. `schema_version` aynı kalır (`0.9`). Eğer agent value-add bir şema değişikliği gerektirirse not düş ama default değiştirme.

### 7. Kısa rapor

İterasyon-12 sonunda yine kısa rapor:

- idea.md'nin yeni "Body üretim disiplini" bölümü yeterince netti mi?
- Outcome body için hangi KB cümlesini referans aldın? (Birebir mi, yoksa yeniden yapılandırdın mı?)
- Lint PASS oldu mu? Geriye warning kaldıysa neden?
- Comparison body'sini değiştirdin mi? Neden / neden değil?
- HTML görsel denge iyileşti mi?
- Body "robotik" geliyor mu, yoksa hala doğal mı?
- 13. iterasyon (ikinci artifact ekleme) için zemin temiz mi?

### 8. Önemli not

Bu iterasyon **Karpathy loop disiplinini test ediyor:** İterasyon-11 FAIL üretti, iterasyon-12 onu çözmek için yapıldı. Eğer paket sonunda PASS dönerse loop çalıştığını kanıtlamış oluruz. Bu disiplin ChatGPT'nin "loop disiplini 6/10" eleştirisini doğrudan adresliyor.

Eğer body değişikliği yetmezse ve hala warning kalırsa, AGENT-PROMPT-11'deki seçeneklere geri dön (multi-occurrence aggregated overlap veya threshold değişikliği), ama **her iki çözüm de spec değişikliği gerektirir** — body sadeleştirmek en temiz yol.

---

Başla. Önce idea.md'nin yeni "Body üretim disiplini" bölümünü oku, sonra outcome body'sini sade ve KB-yakın yaz, opsiyonel olarak comparison body'sini de düşür, test et, HTML'i tarayıcıda doğrula, raporla.
