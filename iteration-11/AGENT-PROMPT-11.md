# İterasyon-11 — Lint sertleştirme (warning → FAIL)

> **Kullanım:** Bu dosyanın TAMAMINI mevcut Claude Code oturumuna tek mesaj olarak yapıştır.

---

## Bağlam

İterasyon-10'a kadar pipeline mühendislik tarafında derinleşti, renderer eklendi. Üçüncü taraf değerlendirmesi (ChatGPT) yapıldı.

Eleştirinin **en kritik bulgusu:**

> *"task.md loop'un özü: failure → instruction refinement. Sende lint warning var ama 'passed: true'. Bu Karpathy loop'a aykırı. Loop'ta bu bir fail sayılmalıydı."*

Bu eleştiri haklı. Şu an outcome body'de 3 soft-trace mismatch var (50.3, 0.001, -0.613 hepsi context window'da KB ile uyuşmuyor) ama artifact PASS geçiyor. Loop disiplini bunu kabul edemez.

`idea.md` rafine edildi: **"Lint sertleştirme — warning ≠ accept (Karpathy loop disiplini)"** bölümü eklendi. Önce bu yeni bölümü oku.

---

## Bu iterasyonda yapılacaklar

### 1. Lint runner severity davranışını değiştir

`src/lint.mjs` içinde `runLint()` fonksiyonu şu an warning'leri `passed: true` ile döndürüyor:

```javascript
return {
  passed: errors.length === 0,  // ← warning'leri görmezden geliyor
  errors,
  warnings,
  rules_checked: rules.map((r) => r.id),
};
```

Yeni davranış:

```javascript
return {
  passed: errors.length === 0 && warnings.length === 0,  // ← warning'ler de FAIL
  errors,
  warnings,
  rules_checked: rules.map((r) => r.id),
  severity_summary: {
    errors: errors.length,
    warnings: warnings.length,
    accepted: errors.length === 0 && warnings.length === 0,
  },
};
```

### 2. CLI exit code'larını ayır

`bin/studio-agent.mjs` içinde compile sonunda:

```javascript
let exitCode = 0;
for (const summary of artifacts) {
  if (summary.lint.errors.length > 0) {
    exitCode = 1;  // hard fail
    break;
  }
  if (summary.lint.warnings.length > 0) {
    exitCode = 2;  // soft fail (yeni)
    // break etme — diğer artifact'ları da işle ama exit kodu 2 olsun
  }
}

if (exitCode > 0) {
  console.error(
    `\n[studio-agent] LINT FAIL — exit code ${exitCode} ` +
    `(${exitCode === 1 ? 'errors' : 'warnings rejected by strict lint'})`
  );
}
process.exit(exitCode);
```

### 3. Bilinçli tolerans mekanizması (acil kapı)

Bazı durumlarda "şu an warning kabul edebilirim" demek gerekir (örn. body üretim disipline edilirken geçici geçit). Bu durumda spec'e opsiyonel bir alan:

```javascript
// graphical-abstract.mjs spec içinde:
strict_lint: {
  reject_warnings: true,  // YENİ — varsayılan true
  // false yaparsan warning'ler PASS sayılır (acil durum kapısı, default kapalı)
},
```

Lint runner bu alanı okuyup davranışı belirler:

```javascript
const rejectWarnings = spec.strict_lint?.reject_warnings ?? true;
return {
  passed: errors.length === 0 && (!rejectWarnings || warnings.length === 0),
  // ...
};
```

`schema_version` → `0.9` (bump).

### 4. Lint metadata'sında "neden FAIL" netleştir

`_metadata.lint` içine yeni alan:

```javascript
lint: {
  passed: false,
  errors: [],
  warnings: [...],
  rules_checked: [...],
  rejection_reason: "warnings exceed strict_lint threshold (3 warnings, reject_warnings=true)",
}
```

Bu, JSON'u tüketen herhangi bir taraf (renderer, dış sistem) **neden reddedildiğini** açıkça görür.

### 5. Renderer davranışı

Mevcut renderer şu an `_metadata.lint.errors > 0` ise reject ediyor. Bunu güncelle:

```javascript
if (json._metadata.lint.passed === false) {
  console.error(`Render aborted: ${json._metadata.lint.rejection_reason}`);
  process.exit(1);
}
```

Yani warning yüzünden FAIL etmiş JSON da render edilmez.

### 6. Test (kritik — bu iterasyon **bilinçli olarak FAIL** üretmeli)

```bash
node bin/studio-agent.mjs compile --source knowledge-base.md --out output --render html
```

Beklenti:
- Output: `[lint FAIL, 0 err, 3 warn]` veya benzeri
- Exit code: 2
- HTML render reddedildi (önceki render kalmış olabilir, dokunma)
- compile-report.json'da `passed: false`, `rejection_reason: "..."` görünür

**Bu beklenen davranış.** İterasyon-12'de body sadeleştirilince warning'ler kaybolacak ve PASS dönecek. Şu an "loop'un disiplini" kanıtlandı: warning artık görmezden gelinmiyor.

### 7. Acil tolerans testi

Geçici olarak `spec.strict_lint.reject_warnings = false` ayarla, tekrar çalıştır:

Beklenti:
- Output: `[lint PASS, 0 err, 3 warn]` (warning'ler hala görünür ama PASS)
- Exit code: 0
- Render edilebilir

Bu mekanizma **acil durum kapısı** olarak duracak — default kapalı, bilinçli açılır.

Test sonrası geri al (`reject_warnings: true`).

### 8. Kısa rapor

İterasyon-11 sonunda yine kısa rapor:

- idea.md'nin yeni "Lint sertleştirme" bölümü yeterince netti mi?
- Severity hiyerarşisi (error/warning/info) doğru tasarlandı mı? Info yine implement edilmedi (gelecek), bu doğru karar mı?
- Acil tolerans mekanizması (`reject_warnings: false`) abuse edilebilir mi? (Birisi her zaman false yaparsa disiplin kaybolur)
- Mevcut paket şu an `[lint FAIL, 0 err, 3 warn]` mi gösteriyor? Mesaj formatı net mi?
- 12. iterasyon (outcome body sadeleştirme) için zemin hazırlandı mı?
- Bu iterasyon paketi "kullanılmaz" hale getirdi mi? (Hocaya akşam göstereceğimiz şey FAIL veriyor — bu bilinçli)

### 9. Önemli not

Bu iterasyon **paketi geçici olarak FAIL durumuna düşürür.** Bu **kasıtlı** ve **doğru.** İterasyon-12'de body sadeleştirilince paket tekrar PASS dönecek. Şu an Karpathy loop disiplinine uygun: failure visible, refinement triggered.

Eğer agent FAIL durumundan kaçınmak için spec'i değiştirir veya warning'leri "info"ya düşürürse — bu **disiplin ihlali**dir, raporda not düş.

---

Başla. Önce idea.md'nin yeni "Lint sertleştirme" bölümünü oku, sonra runLint fonksiyonunu güncelle, CLI exit code'larını ayır, bilinçli tolerans mekanizması ekle, renderer'ı güncelle, hem strict hem tolerant modda test et, raporla.
