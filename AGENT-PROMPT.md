# Studio-Agent İlk İterasyon — Agent Prompt

> **Kullanım:** Bu dosyanın TAMAMINI kopyala, yeni Claude Code (veya Codex) oturumuna tek mesaj olarak yapıştır.

---

Sen bir coding agent'sın. Görevin aşağıdaki idea.md dosyasında tanımlanmış "studio-agent" vizyonuna uygun çalışan minimum bir npm paketi inşa etmek.

## Bağlam

- Bu Karpathy Autoresearch Loop yöntemiyle çalışan bir görev.
- Ben (kullanıcı) idea.md'yi sürekli rafine edeceğim.
- Sen npm paketini sürekli inşa edeceksin.
- Bu **ilk iterasyon** — mükemmel olmasına gerek yok.
- Çıktıyı `knowledge-base.md` ile test edeceğiz.

## Bu iterasyonun scope'u

- Minimum çalışan bir npm paketi (CLI ile çalıştırılabilir)
- `knowledge-base.md`'yi okuyup **1-2 artifact tipi** üretsin (tüm aileleri değil)
- Önerilen başlangıç tipleri: `executive-memo` + `visual-abstract` (knowledge-base'in 7. ve 8. bölümleri zaten bu yöne işaret ediyor — istersen değiştir, gerekçesini söyle)
- Her artifact JSON veya markdown olarak çıksın
- Her artifact **provenance metadata** içersin (hangi knowledge-base bölümünden türedi)
- Artifact üretimi **şema-disiplinli** olsun (her tip kendi kontratına sahip)

## Yapacakların

1. Önce `idea.md`'yi dikkatlice oku, özünü anla.
2. Bu dizin için bir paket yapısı öner (klasörler, dosyalar).
3. `package.json` + bin entry + source files yaz.
4. CLI'yi `knowledge-base.md` üzerinde gerçekten çalıştır.
5. Üretilen artifact'ları göster.

## Kritik kısıtlar

- **Spec'i değiştirme** — eksik bulduğun yerleri belirt, ben rafine edeceğim.
- **Aşırı feature ekleme** — 1-2 artifact tipi yeter; tüm aileyi denersen agent boğulur.
- **Provenance unutma** — her artifact frontmatter veya metadata field'ı taşımalı.
- **Lint katmanını implement et** — basit kurallarla bile (örn. zorunlu bölümler kontrol).

## Beklenen iterasyon sonrası teslim

1. `package.json` + kaynak kodlar
2. Çalıştırma talimatı (`npm install && node bin/...`)
3. `knowledge-base.md` ile çalıştırma çıktısı (örnek artifact'lar)
4. Kısa rapor: idea.md'nin neresi muğlaktı, neyi yorumlamak zorunda kaldın, bir sonraki iterasyon için hangi bölümler netleştirilmeli?

---

## ekli dosya: idea.md (studio-agent vizyonu — hocanın yazdığı)

(Dosya bu dizinde `idea.md` olarak mevcut, oku.)

## ekli dosya: knowledge-base.md (test verisi — 3 istatistiksel rapordan derleme)

(Dosya bu dizinde `knowledge-base.md` olarak mevcut, oku.)

---

Başla. Önce kısa bir analiz yap, sonra paket yapısını öner, sonra inşa et. İlk iterasyonun zaten kötü olacağını biliyoruz — bu sorun değil; loop'un amacı bu.
