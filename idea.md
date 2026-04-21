# studio-agent

Wiki veya RAG üstünde derlenmiş bilgiyi, NotebookLM'deki Studio benzeri şekilde, tekrar tekrar üretilebilen artifact'lara dönüştürmek için bir örüntü. Hedef, sadece sorulara cevap veren bir sistem değil; kaynaklardan türeyen briefing, FAQ, checklist, slide outline, lesson plan, worksheet, podcast script, video outline, report, explainer, interactive mini-app spec ve benzeri "çalışılabilir çıktı"lar üreten bir ajan katmanı kurmaktır.

Bu bir idea file'dır. Kendi LLM ajanına (Claude Code, Codex, OpenCode veya benzeri) kopyala-yapıştır olarak verilmek üzere tasarlanmıştır. Amacı belirli bir uygulamayı değil, yüksek seviyede örüntüyü iletmektir. Spesifikleri sen ve ajanın birlikte, kendi ürününe ve bilgi alanına göre inşa edeceksiniz.

## Çekirdek fikir

Çoğu bilgi sistemi iki uçta kalır.

Birinci uç, klasik soru-cevap katmanıdır. Kullanıcı bir şey sorar, sistem kaynakları okur, cevap üretir. Bu faydalıdır ama ephemeral'dır; her etkileşim bir anda olup biter. Aynı bilgi, ertesi gün farklı formatta yeniden istenirse süreç baştan kurulur.

İkinci uç, statik içerik üretim araçlarıdır. Bir rapor, bir sunum, bir özet veya bir podcast script'i tek seferlik üretilir. Kaynaklar güncellendiğinde artifact stale olur; hangi kaynaktan türediği zamanla kaybolur; aynı içerikten farklı artifact türleri üretmek için tekrar emek gerekir.

Buradaki fikir üçüncü bir yol: bilgi tabanının üstünde, artifact üretimini birinci sınıf vatandaş yapan bir studio-agent katmanı kurmak. Sistem önce ham kaynakları Karpathy tarzı derlenmiş bir wiki'ye dönüştürür. Sonra bu wiki üstünde çalışan studio-agent, aynı bilgi çekirdeğini farklı artifact biçimlerine dönüştürür. Artifact bir son ekran görüntüsü veya tek-shot cevap değildir; versiyonlu, yeniden üretilebilir, kaynağı bilinen ve güncellendiğinde tekrar derlenebilen bir üründür.

Anahtar fark budur: klasik chatbot cevap üretir, klasik content tool dosya üretir, studio-agent ise bilgiyi artifact ailesine kompile eder. Aynı wiki'den bir briefing, bir öğretmen notu, bir flashcard seti, bir müşteri FAQ'su, bir audio overview script'i, bir slide outline'ı ve bir etkileşimli mini deneyim spesifikasyonu çıkabilir. Bilgi bir kez derlenir; artifact'lar tekrar tekrar üretilir.

Bu farkın pratik sonuçları şunlardır. Bir artifact'ın kalitesi yalnız prompt'a değil, wiki'nin derinliğine ve artifact şablonunun disiplinine bağlı olur. Artifact'lar source-aware olur; hangi wiki sayfalarından ve hangi raw kaynaklardan türedikleri görünür olur. Kaynak değişince artifact'ın stale olduğu anlaşılır. Kullanıcı yalnız "bana bunu açıkla" demez; "bunu öğrenci çalışma kağıdına çevir", "bunu müşteri brifine çevir", "bunu 5 dakikalık audio overview'a çevir", "bunu yöneticilere tek sayfalık memo yap" der. Studio-agent, sorguyu bir cevap isteği olarak değil, bir artifact üretim görevi olarak ele alır.

## Ne olduğu ve ne olmadığı

Bu ürün bir genel chatbot değildir. Bir not alma uygulaması değildir. Sadece bir export menüsü de değildir.

Bu ürün, bilgi tabanının üstünde duran bir artifact compiler'dır. Merkezinde tek bir şey vardır: aynı bilgi çekirdeğini, farklı bağlamlara uygun, yeniden üretilebilir artifact'lara dönüştürmek.

Bu ürünün wiki'si source of truth değildir; raw kaynaklar source of truth'tur. Wiki, onların LLM tarafından derlenmiş ve ilişkilendirilmiş çalışma katmanıdır. Studio-agent da bu wiki'nin üstünde çalışan üretim katmanıdır.

Bu ürün bir "tek promptla sunum üret" sihirbazı değildir. Eğer artifact üretimi tamamen prompt büyüsüne dayanıyorsa, birikim yoktur. Studio-agent'ın değeri, artifact üretimini schema, provenance, lint ve re-render disiplini içine almasıdır.

Başarının sade ölçüsü şudur: aynı bilgi tabanından, çok az ek insan emeğiyle, farklı hedefler için tutarlı ve işe yarar artifact'lar üretilebiliyor mu? Eğer onuncu artifact, ilk artifact kadar el emeği istiyorsa, örüntü çalışmıyordur. Eğer artifact'lar kaynak değişiminden habersizse, yine çalışmıyordur.

## Mimari

Üç katman vardır.

### Raw + wiki substrate

İlk katman, Karpathy tarzı bilgi tabanıdır.

Raw kaynaklar immutable'dır: PDF'ler, dökümanlar, transkriptler, ürün notları, araştırma raporları, ders materyalleri, müşteri brief'leri, veri tabloları, iç yazışmalar, web sayfaları.

Wiki ise LLM tarafından tutulan markdown ağacıdır: kavram sayfaları, entity sayfaları, özetler, karşılaştırmalar, prosedürler, zaman çizelgeleri, glossary, contradiction notes, open questions.

Bu katman artifact üretiminin yakıtıdır. Studio-agent ham chunk'lar üstünde değil, derlenmiş wiki üstünde çalışır. Retrieval hâlâ vardır ama zaten derlenmiş, çapraz referanslı ve bakım altında bir substrate üstünden yapılır.

### Artifact schema katmanı

İkinci katman, hangi artifact türlerinin var olduğunu ve her birinin nasıl üretileceğini tanımlar.

Her artifact türü kendi kontratına sahiptir:

- input beklentisi: hangi wiki sayfaları, hangi alt-alan, hangi kullanıcı amacı
- output formatı: markdown, html, json, script, slide-outline, qa-bank, worksheet, memo, report, narration, timeline
- kalite kuralları: ton, uzunluk, yapı, citation disiplini, red lines
- human-in-loop rejimi: otomatik yayınlanabilir mi, örneklem onayı mı gerekir, her seferinde insan mı bakar
- stale kuralları: hangi kaynak değişiklikleri artifact'ı yeniden üretmeyi zorunlu kılar

Bu katman, studio-agent'ın "hangi studio işi yapabildiğini" tanımlar. NotebookLM benzeri bir studio hissi, aslında bu artifact tiplerinin iyi tanımlanmış olmasından gelir. Aksi halde ürün yalnızca farklı prompt preset'leri gösteren bir panel olur.

### Runtime

Üçüncü katman, artifact üretim motorudur.

Görevi: kullanıcı isteğini anlamak, doğru artifact türüne map etmek, wiki'den ilgili sayfaları seçmek, artifact taslağını üretmek, kurallara göre lint etmek, gerekirse insana eskale etmek, artifact'ı version'lamak ve paylaşılabilir hale getirmek.

Bu katman tek bir LLM çağrısı değildir. Tipik akış şu adımları içerir:

- niyet sınıflandırma: istek bir soru mu (rag-wiki'ye yönlendir) yoksa artifact talebi mi (studio-agent'ta tut)
- artifact routing: istenen şey briefing mi, deck outline mı, worksheet mi, audio script mi
- context assembly: ilgili wiki sayfalarının seçimi
- draft generation: ilk artifact taslağı
- verification/lint: format, kapsam, tone, kaynak, güvenlik kontrolü
- publish/writeback: artifact metadata'sı, sürümü, kaynak bağları, stale işaretleri

Runtime, artifact üretimini cevap üretiminden ayrı bir operasyon olarak ele alır. Bu ayrım korunmazsa sistem zamanla yine "uzun cevap veren chatbot"a geri düşer.

## Operasyonlar

### Artifact oluşturma

Ana operasyon budur. Kullanıcı açıkça bir artifact ister:

"Bunu yönetici özeti yap." "Bu kaynaklardan 10 soruluk quiz hazırla." "Bu konuyu podcast outline'ına çevir." "Bu ürünü yeni müşteri için onboarding brief'e dönüştür." "Bu araştırmadan slide deck skeleton çıkar."

Runtime önce bunun hangi artifact tipine düştüğünü belirler. Eğer tek bir tipe yüksek güvenle map edemiyorsa iki veya üç aday önerir. Emin değilken uydurmaz; kullanıcıya artifact niyetini netleştirtir.

### Artifact compile

Artifact tipi seçilince runtime, ilgili wiki sayfalarını ve gerekiyorsa raw kaynaklara ait provenance metadatasını toplar. Bu aşamada yalnızca "en yakın metinleri" çekmek yetmez; artifact yapısına göre hangi kaynak türlerinin ağırlıklı olacağı da değişir.

Bir executive memo için synthesis ve risk sayfaları önceliklidir. Bir worksheet için tanım, örnek ve misconception sayfaları önceliklidir. Bir audio overview script'i için narrative flow ve comparison sayfaları önceliklidir. Bir slide outline için section hierarchy ve visualizable claims önceliklidir.

Studio-agent burada yalnız retrieval yapmaz; artifact-aware context assembly yapar.

### Lint ve gate

Artifact üretildikten sonra hemen yayınlanmaz. Her artifact tipi kendi lint pass'inden geçer.

Yapı doğru mu? Hedef kitleye uygun ton kullanılmış mı? Kaynağı olmayan iddialar var mı? Artifact tipi için zorunlu bölümler eksik mi? Kapsam dışına taşmış mı? Riskli bir artifact türünde human review zorunlu mu?

Bu gate katmanı olmadan studio-agent çok hızlı içerik üretir ama bir "artifact factory" olur; güvenilir studio olmaz.

### Publish ve versioning

Başarılı artifact bir dosya olarak kaydedilir. Ama önemli olan dosyanın kendisi kadar metadata'sıdır:

- hangi artifact türü
- hangi wiki sayfalarından türedi
- hangi raw kaynak hash'lerine dayanıyor
- hangi schema sürümüyle üretildi
- son insan onayı var mı
- ne zaman stale olur

Artifact, tek başına içerik değildir; lineage taşıyan bir build artifact'ıdır.

### Re-render

Raw kaynak veya wiki değiştiğinde, daha önce üretilmiş artifact'ların hangilerinin stale olduğu otomatik anlaşılmalıdır. Studio-agent'ın güçlü olduğu yer burasıdır: artifact yeniden yazılmaz, yeniden derlenir. Böylece "geçen ay ürettiğimiz briefing'i yeni kaynaklarla güncelle" isteği ayrı bir insan emeği gerektirmez; sistem artifact'ın türediği bağımlılık grafiğini bildiği için kontrollü re-render yapabilir.

### Writeback

Artifact üretimi sadece dışa dönük değildir; içe doğru da bir writeback etkisi vardır. Sık üretilen artifact tipleri, wiki'de hangi bilgi eksiklerinin olduğunu görünür kılar.

Sürekli quiz üretiminde boşluk çıkıyorsa misconception sayfaları zayıftır. Sürekli executive memo'da "riskler" bölümü uyduruluyorsa risk sayfaları eksiktir. Sürekli audio script'ler dağınıksa wiki'de narrative synthesis eksiktir.

Yani artifact kalitesi, wiki bakımının teşhis aracına dönüşür.

## Artifact aileleri

Studio-agent tek tip artifact'a kilitlenmez. Gücü, aynı substrate'den artifact ailesi üretmesidir. Örnek aileler:

### Öğrenme artifact'ları

- çalışma notu
- flashcard seti
- quiz / answer key
- worksheet
- Socratic discussion guide
- lesson plan
- misconception sheet

### Analiz artifact'ları

- executive memo
- one-page brief
- contradiction report
- timeline
- comparison matrix
- risk register
- FAQ

### Sunum ve anlatı artifact'ları

- slide outline
- talk track
- audio overview script
- video overview outline
- demo script
- onboarding brief
- walkthrough narrative

### Etkileşimli artifact'ları

- mini app spec
- interactive checklist
- decision tree
- guided form flow
- HTML prototype spec

Buradaki nokta şudur: studio-agent her zaman nihai çıktıyı üretmek zorunda değildir. Bazen doğrudan artifact dosyasını üretir; bazen artifact bir sonraki üretim sisteminin girdisi olur. Örneğin slide outline doğrudan sunum olmayabilir, ama slides-agent için compile edilmiş girdi olabilir.

## rag-wiki ile ilişki

rag-wiki, sorgu ve doğrulama katmanıdır. Studio-agent ise artifact üretim katmanıdır.

Kullanıcı "bu nedir?" diye sorduğunda rag-wiki devreye girer. Kullanıcı "bunu briefing'e çevir" dediğinde studio-agent devreye girer.

İkisi aynı wiki üstünde yaşar ama aynı işi yapmaz. rag-wiki güvenli cevap üretmeyi optimize eder. studio-agent yeniden üretilebilir artifact üretmeyi optimize eder.

Bir artifact üretimi sırasında studio-agent, ihtiyaç duyduğu doğrulama ve kaynak kontrolü için rag-wiki'nin verification servislerini çağırabilir. Ama mimari ayrım korunmalıdır: biri query motoru, diğeri compile motorudur.

NotebookLM benzeri studio hissi de tam burada doğar: sorgu paneli ayrı bir şeydir, studio paneli ayrı bir şeydir. Kullanıcı bilgiyle konuşabilir de, bilgiyi artifact'a dönüştürebilir de. Bu ikisini aynı textarea'ya sıkıştırmak, ürünün farkını bulanıklaştırır.

## demo-wiki ve tour-agent ile ilişki

demo-wiki, belirli persona ve müşteriler için hangi anlatının önemli olduğunu derleyen katmandır. Studio-agent bu derlemeden çeşitli müşteri-facing artifact'lar üretebilir:

- sales brief
- account summary
- persona-specific one-pager
- narrated walkthrough outline
- post-meeting recap

tour-agent ise artifact'ların canlı üründe render edildiği veya oynatıldığı komşu sistemdir. Studio-agent bir walkthrough script'i veya onboarding outline'ı üretir; tour-agent bunu gerçek ürün içinde deneyime dönüştürür.

Bu yüzden studio-agent, "artifact compiler" olarak, query motoru (rag-wiki) ve canlı deneyim motoru (tour-agent) arasında orta katman rolü oynar.

## Çoklu alt-alan ve izolasyon

Tek bir studio-agent her şeyi aynı artifact şablonuyla üretmemelidir. Alt-alanlar farklıdır.

Eğitim alanındaki worksheet şeması ile hukuk alanındaki memo şeması aynı olamaz. Ürün onboarding brief'i ile klinik karar özeti aynı ton, aynı gate, aynı risk modeliyle yazılamaz.

Bu yüzden artifact schema'ları subdomain bazlı olmalıdır:

- kendi wiki yolları
- kendi lint kuralları
- kendi output template'leri
- kendi onay rejimleri
- kendi eval set'leri

Alan izolasyonu, artifact üretiminin büyüdükçe saçmalamamasının tek garantisidir.

## Human-in-loop

Tüm artifact'lar eşit risk taşımaz.

Düşük riskli artifact'lar: iç çalışma notu, kişisel flashcard, taslak checklist. Bunlar otomatik üretilebilir.

Orta riskli artifact'lar: müşteri brief'i, satış one-pager'ı, eğitim materyali. Bunlarda örneklem veya hafif review gerekir.

Yüksek riskli artifact'lar: hukuki özet, medikal açıklama, yöneticiye gidecek kritik memo, dışarı yayınlanacak resmî materyal. Bunlar human approval olmadan publish edilmemelidir.

Studio-agent'ın işi yalnız artifact üretmek değil, hangi artifact'ın hangi review rejimine girdiğini bilmektir. "Hepsini üret, sonra insanlar bakar" yaklaşımı ölçeklenmez. Review rejimi artifact şemasının parçası olmalıdır.

## Değerlendirme

Bir değişikliğin iyi olup olmadığını anlamak için şu soruları sor:

Aynı bilgi tabanından daha fazla artifact türü, daha az prompt emeğiyle üretilebiliyor mu? Artifact'ların yapısal kalitesi tutarlı mı, yoksa her seferinde prompt'a göre savruluyor mu? Kaynak değişiklikleri artifact stale takibini doğru tetikliyor mu? Artifact üretimi, wiki'deki boşlukları görünür kılıyor mu? Düşük riskli artifact'lar otomatik akabiliyor, yüksek riskliler doğru yerde insana takılıyor mu? Aynı artifact tipi için ikinci, üçüncü, onuncu üretim ilkine göre ucuzladı mı?

Eşit koşullarda daha sade olan kazanır. On yeni artifact butonu eklemek ilerleme değildir; iki artifact tipini gerçekten güvenilir, yeniden üretilebilir ve provenance-aware hale getirmek ilerlemedir.

## Neden işe yarar

Bilgi sistemlerinin en büyük kaybı, aynı bilginin farklı bağlamlar için tekrar tekrar elle paketlenmesidir. Bir araştırma notu ayrı hazırlanır, sunum ayrı yazılır, müşteri özeti ayrı yazılır, quiz ayrı hazırlanır, sesli anlatım ayrı düşünülür. Bilgi bir kez toplanır ama çıktılar tekrar tekrar el emeğiyle üretilir.

Studio-agent bu tekrarın büyük bölümünü compile problemine çevirir. Bilgi önce wiki'de derlenir. Sonra farklı artifact'lar bu bilgi çekirdeğinden üretilir. Artifact türleri ve şemaları netleştikçe sistem hızlanır; her yeni artifact, aynı zamanda bir sonraki artifact üretimini ucuzlatır.

Bu sayede bilgi tabanı sadece okunacak bir yer olmaktan çıkar; sürekli çalışan bir yayın ve üretim motoruna dönüşür. Soru cevaplama önemini korur, ama tek arayüz olmaktan çıkar. Asıl değer, bilginin kullanılabilir formlara dönüşmesindedir.

## Pilot subdomain: medical-graphical-abstract

Studio-agent'ın çoklu alt-alan ilkesini somutlaştırmak için ilk pilot subdomain `medical-graphical-abstract` olarak tanımlıdır. Bu subdomain, tıbbi araştırma kaynaklarından (ham makale, abstract, knowledge-base) **JAMA / Annals of Surgery (Ibrahim) 3-panel triptych** formatında graphical abstract artifact'ları üretir.

Bu subdomain'in artifact şeması şu kontrata sahiptir:

- **Tip:** `graphical-abstract`
- **Format:** 3-panel triptych (Population / Intervention veya Comparison / Outcome)
- **Üst metadata:** title, citation, journal hint
- **Her panel:** title, primary_number (hero metrik veya n), body (max 15 kelime), icon_hint (tek-renk ikon önerisi)
- **Çıktı formatı:** JSON (renderer-agnostic — React Native, SVG, HTML herhangi biri tüketebilir)
- **Lint kuralları:** tam 3 panel zorunlu, her panelde primary_number doğrulanır, body uzunluğu denetlenir, panel başlıkları PICO ailesine uymalıdır
- **Human-in-loop:** orta risk (tıbbi içerik) — örneklem onayı önerilir, otomatik publish edilmez
- **Stale kuralları:** kaynak değişikliği veya 3 panel zorunluluğunun değişmesi yeniden derlemeyi tetikler

İlk iterasyonda denenen `executive-memo` ve generic `visual-abstract` tipleri bu subdomain'in dışındadır ve registry'den çıkarılmalıdır. Subdomain disiplini, "tek artifact tipini gerçekten doğru yapma" ilkesine uygun şekilde tek bir tipe odaklanır.

### Numerik trace disiplini (halüsinasyon kapısı kapatma)

`graphical-abstract` artifact'ının ürettiği **her numerik değer** kaynak knowledge-base'de substring olarak izlenebilir olmalıdır. Bu, halüsinasyona karşı şema düzeyinde bir bariyerdir; "yaklaşık doğru" kabul edilmez.

**Kapsam — trace zorunlu olan alanlar:**

- `panels[].primary_number` (zaten iterasyon-2'de uygulanıyor)
- `footer.key_stats[]` (her bir istatistik string'i — şu an açık halüsinasyon kapısı, kapatılmalı)
- `panels[].secondary_number[]` (gelecek iterasyonda eklenecek alan)
- Body içindeki sayısal değerler — best-effort warning (zorunlu değil ama loglanır)

**Trace algoritması — Level A (default, whitespace-normalized substring):**

Kaynak metin ve aday değer karşılaştırılırken:

1. Her iki tarafta tüm whitespace karakterleri (`\s+`) çıkarılır
2. Lowercase'e çevrilir (case-insensitive)
3. Aday değerin normalize edilmiş hali, kaynağın normalize edilmiş halinde substring olarak aranır
4. Bulunamazsa lint error (artifact reddedilir)

Örnek:
- Kaynak: `Etki Büyüklüğü (r)\n| **-0.613** |`
- Aday: `r = -0.613`
- Normalize: kaynak → `etkibuyuklugu(r)|**-0.613**|`, aday → `r=-0.613`
- Substring eşleşmesi: aday değerinin sayısal çekirdeği (`-0.613`) kaynakta vardır → PASS

**Future seviyeler (henüz uygulanmadı):**

- **Level B (literal substring):** Whitespace dahil tam karakter eşleşmesi. KB formatlamasına kırılgan; medikal alanda regülasyon gerektiriyorsa kullanılır.
- **Level C (semantic match):** LLM-verifier ile sayı + birim + bağlam birlikte doğrulanır (örn. "240 katılımcı" referansı sadece "240" ve "katılımcı"nın birlikte geçtiği kısımda kabul edilir). En sıkı seviye; ek LLM çağrısı maliyeti vardır.

Trace seviyesi her artifact spec'inde declarative olarak yer almalı: `trace_level: "A" | "B" | "C"`. `medical-graphical-abstract` subdomain'i için varsayılan **Level A**'dır; ileride Level B/C'ye terfi edilebilir.

**Lint kuralı genelleştirmesi:** Tek bir `numeric-fields-traceable` kuralı, artifact tipi içindeki tüm declared numeric fields üzerinde dolaşmalıdır. Tek tek alan başına ayrı kural yazmak (`primary-number-traceable`, `key-stats-traceable`) DRY ihlalidir; bunun yerine spec'te numeric fields listesi declare edilir, lint runner üzerinde dolaşır.

### Multi-value string parçalı trace

İterasyon-3'ün ortaya çıkardığı kritik açık: bir string birden fazla sayısal değer içeriyorsa, bütün string trace başarılı olsa bile parçalardan biri uydurma olabilir.

**Örnek vaka:**
```
"n = 240, süre = 12 ay"
```
KB'de "240" geçiyor ve "12 ay" da farklı bir bağlamda geçiyor olabilir. Whitespace-normalized substring araması bütün string için (`n=240,süre=12ay`) FAIL verir — ama eğer KB'de bu compound string literal olarak yer alıyorsa PASS verir. Sorun: parçalar ayrı doğrulanmadığı için *eğer compound string KB'de literal varsa içindeki herhangi bir sayı uydurma olsa bile geçer.*

Daha tehlikeli senaryo: agent "12 ay" yerine "120 ay" yazsa ve bu `n = 240, süre = 120 ay` compound string KB'de literal olarak yoksa zaten bütün lint FAIL — ama eğer agent dikkatlice "n = 240" parçasını KB'den alıp yanına uydurma "süre = 120 ay" eklerse, **string'in sayısal çekirdeğinin doğrulanması ayrıca yapılmazsa** halüsinasyon sızar.

**Çözüm — `extract_numeric_core` spec genişletmesi:**

`numeric_fields` her entry'sine opsiyonel bir alan eklenir:

```javascript
numeric_fields: [
  { path: 'panels[].primary_number', required: true, extract_numeric_core: true },
  { path: 'footer.key_stats[]', required: true, extract_numeric_core: true },
],
```

`extract_numeric_core: true` olduğunda lint kuralı **iki katmanlı doğrulama** yapar:

1. **Bütün string trace (mevcut):** Whitespace-normalized substring matching ile tüm string KB'de aranır
2. **Sayısal çekirdek trace (yeni):** String içindeki tüm sayısal değerler regex ile çıkarılır (`-?\d+\.?\d*%?` veya `\b\d+\.?\d+\b` benzeri) ve **her biri ayrı ayrı** KB'de aranır

İki kontrol de PASS ise alan onaylanır. Sayısal çekirdeklerden biri bile bulunamazsa lint FAIL — compound string'in literal olarak KB'de geçmesi tek başına yeterli değildir.

**Algoritma — sayısal çekirdek extractor:**

Default regex: `/-?\d+\.?\d*%?/g` (sayı, opsiyonel ondalık, opsiyonel %)

Bulunan her aday için:
- `0` veya `1` gibi tek haneli ortak sayıları **atla** (false positive azaltma — KB'de "1" defalarca geçer)
- 2+ haneli sayıları, ondalık sayıları ve `%` içeren değerleri zorunlu doğrulamaya tabi tut
- Her birini whitespace-normalized substring matching ile KB'de ara

**Hata raporlama:**

Bir alan iki katmandan birinde başarısız olursa lint mesajı şu formatta olmalı:

```
Numerik alan bulunamadı: panels[2].primary_number
  - bütün string: "%50.3 azalma" → trace: PASS
  - sayısal çekirdek: ["50.3"] → trace: FAIL ("50.3" KB'de yok)
```

Bu agent'ın hangi seviyede hata yaptığını anlaması için kritik (whole vs core).

**Uygulama notu:** body alanlarındaki sayı doğrulaması (gelecek iterasyon konusu) bu altyapının doğal genişlemesidir. Aynı `extract_numeric_core` mantığı body'de regex-based sayı çıkarımıyla uygulanabilir, ancak **warning** seviyesinde — body insan-okur metin, sayısal kesinlik primary_number/key_stats kadar kritik değildir.

### Context-aware core matching (Level B'ye yaklaşım)

İterasyon-4 deneyimsel olarak göstermiştir ki tek başına substring core matching yeterli değildir: bir sayı KB'de farklı bir bağlamda substring olarak geçebilir ve false positive üretebilir.

**Kanıtlanmış vaka:**
- Aday: `süre = 12 ay` (uydurma)
- Core: `12`
- KB: "120.5", "12.588" gibi sayılar var
- Substring match: `12` PASS (yanlış)
- Gerçek: KB'de `12 ay` yok, ama `120` içinde `12` substring olarak var

Bu, halüsinasyonun gizli kanaldan sızdığı yerdir. Compound string trace ikinci katman olarak yakaladı, ama core seviyesinde tek başına yetersiz olduğu kanıtlandı.

**Çözüm — `context_window` spec alanı:**

`numeric_fields` her entry'sine opsiyonel bir alan eklenir:

```javascript
numeric_fields: [
  {
    path: 'panels[].primary_number',
    required: true,
    extract_numeric_core: true,
    context_window: { chars_before: 6, chars_after: 6 }  // YENİ
  },
],
```

`context_window` aktifse lint **üç katmanlı doğrulama** yapar:

1. **Whole string trace** (Level A — mevcut): tüm string KB'de substring olarak aranır
2. **Numeric core trace** (Level A+ — iterasyon-4): her sayı ayrı ayrı KB'de substring olarak aranır
3. **Context window trace** (Level B — YENİ): her core'un orijinal string içindeki etrafındaki N karakter de **birlikte** KB'de aranır

**Algoritma — context window extraction:**

Aday string içinde her core için:
- Core'un başlangıç pozisyonu bulunur (regex `match.index`)
- `chars_before` kadar öncesi alınır
- Core ve `chars_after` kadar sonrası alınır
- Bu window normalize edilir (whitespace-strip + lowercase)
- Normalize edilmiş window KB'de substring olarak aranır

Örnek:
- Aday: `n = 240, süre = 999 ay`
- Core: `240` (index 4)
- chars_before=6, chars_after=6
- Window: `n = 240, sür` → normalize: `n=240,sür`
- KB'de `n=240,sür` aranır — KB'de muhtemelen `n=240` geçiyor ama `,sür` yok → window FAIL → ama core PASS → ⚠️ context mismatch

- Core: `999` (index 14)
- Window: `süre = 999 ay,` → normalize: `süre=999ay,`
- KB'de yok → core zaten FAIL → toplu FAIL

**Hata raporlama (üç katmanlı):**

```
Numerik alan başarısız: footer.key_stats[0]
  - aday: "n = 240, süre = 12 ay"
  - whole string trace: FAIL
  - numeric cores: ["240", "12"]
    - "240": substring PASS, context window "n = 240" → KB'de aranıyor: PASS
    - "12": substring PASS (false-positive: "120.5" içinde), context window "süre = 12 ay" → KB'de aranıyor: FAIL
  - sonuç: REJECT (en az bir core'un context'i KB'de bulunamadı)
```

**Önemli karar — context window katmanının severity'si:**

Üç olası tasarım:
- **Strict:** Context window FAIL → artifact REJECT (Level B disiplini)
- **Warning:** Context window FAIL → warning üret, artifact PASS (false negative riskini azaltır)
- **Configurable:** spec entry'sinde `context_strictness: "strict" | "warning"` belirlensin

`medical-graphical-abstract` subdomain için **strict** önerilir — tıbbi alan, yanlış sayı bağlamı klinik kararı etkileyebilir. Ama bu seçim subdomain bazlı override edilebilmeli.

**False negative riski:**

Context window'un KB'de bulunmaması her zaman halüsinasyon işareti değildir. KB'nin formatı agent'ın string formatından farklı olabilir (örn. tire vs nokta, parantez içi notasyon). Bu nedenle:

- `chars_before` ve `chars_after` küçük tutulmalı (default 6, max 10)
- Window'da özel karakterler (parantez, virgül, çift tırnak) opsiyonel olarak strip edilmeli (`window_normalize_punctuation: true`)
- Strict moddayken bile, agent rejected artifact için **alternative core windows** önerebilir (örn. window=4 ile dene, sonra window=8 ile dene)

**Future seviye — Level C (semantic match):**

Context window LLM ile semantic eşleştirmesine evrildiğinde gerçek Level C'ye geçilir. O noktada window string substring değil, **anlam denkliği** olarak doğrulanır (ör. "n = 240" ve "240 katılımcı" semantic olarak eşittir). Ek LLM çağrısı maliyeti vardır; sadece yüksek-risk subdomainlerde kullanılır.

### Soft-trace alanlar (body warning katmanı)

Mevcut `numeric_fields` listesi sadece **hard-trace** alanları kapsar: bir core veya context window FAIL → artifact REJECT. Bu, kritik alanlar (primary_number, key_stats) için doğru disiplindir. Ancak agent'ın ürettiği serbest metin alanları (`panels[].body`, gelecekte `header.citation` gibi) çoğunlukla **insan-okur prosa** içerir; içlerinde sayısal değerler bulunabilir ama bütün metni katı doğrulamaya tabi tutmak yanlış olur (cümle yapısı, geçiş kelimeleri, sıralı okuma için ek metin).

Buna rağmen, **body alanlarındaki sayılar da uydurma olabilir.** Şu an outcome body'de "Zaman 1 → Zaman 2 ortanca %50.3 düşüş; p<0.001, r=-0.613 büyük negatif etki" diyebilen agent, gelecekte "%60 düşüş" yazsa kimse yakalamaz. Bu **görünmez halüsinasyon yüzeyi**dir.

**Çözüm — `soft_trace_fields` opsiyonel kategorisi:**

Spec'e yeni bir liste eklenir:

```javascript
soft_trace_fields: [
  {
    path: 'panels[].body',
    severity: 'warning',
    extract_numeric_core: true,
    context_window: { chars_before: 6, chars_after: 6 }
  }
],
```

`soft_trace_fields` davranışı `numeric_fields` ile aynı altyapıyı kullanır (extractNumericCoresWithContext, 3-katmanlı doğrulama) — fark: bir alan FAIL ettiğinde artifact reddedilmez, **lint warning** üretilir. Warning'ler:

- `compile-report.json`'da görünür hale gelir
- Agent'ın gelecekte düzeltebileceği "fırsat noktaları" olur
- `interpreter_notes`'a writeback sinyali olarak eklenebilir

**Severity hiyerarşisi:**

```
hard (numeric_fields)   → FAIL ise artifact REJECT (lint error)
soft (soft_trace_fields)→ FAIL ise artifact PASS, warning üretilir
```

**Body için pragmatik kural:**

- Body içindeki **2+ haneli sayılar** ve **ondalık sayılar** doğrulanır (50.3, 0.001, -0.613 gibi)
- Tek haneli sayılar (Zaman 1, Zaman 2 içindeki "1" ve "2") **atlanır** — body'lerde sıkça pozisyonel/sıralı sayı geçer
- Yüzde işareti içerenler (50.3%, %50.3) doğrulanır
- Bir body'de hiç sayı yoksa zaten kontrol gerekmez

**Halüsinasyon yüzey kapsamı (iterasyon-6 sonrası):**

| Alan | Tipi | Davranış |
|---|---|---|
| `panels[].primary_number` | hard | FAIL → REJECT |
| `panels[].secondary_number[]` (gelecek) | hard | FAIL → REJECT |
| `footer.key_stats[]` | hard | FAIL → REJECT |
| `panels[].body` | **soft (yeni)** | FAIL → warning |
| `header.title` | trace yok | — |
| `header.citation` (opsiyonel gelecek) | soft | warning |

Soft alanlar **görünür halüsinasyon yüzeyini** yarıya indirir: agent body'de uydursa bile lint görür, artifact yine geçer ama uyarı raporlanır. Yazılım mühendisliği analojisiyle: hard = compile error, soft = lint warning. İkisi de değerli, biri kritik biri pragmatik.

### Token-aware context window (chars-based kırılganlığın çözümü)

İterasyon-5'in `context_window: { chars_before, chars_after }` tasarımı pragmatik bir MVP idi, ama iki gerçek sorunu vardı:

1. **Kelime ortasından kesim:** "süre = 12 ay" değerinin etrafında 6 char alındığında window "üre = 12 ay" oluyor — "süre" kelimesinin ilk harfi kayboluyor.
2. **Format varyasyonuna kırılganlık:** KB "n = 240" yazıyor, agent "n=240" yazsa, normalize edilmiş window "n=240" KB'de aranıyor → KB'de "n=240" yok, "n = 240" var → FAIL. Format tolerans sıfır.
3. **Paraphrase gürültüsü (iterasyon-6'da gözlendi):** Outcome body "%50.3 düşüş" yazıyor, KB "%50.3 azalma" yazıyor. Char-based window paraphrase'ı yakalıyor ama her zaman gürültü olarak — agent stil değiştirdiğinde de warning üretiyor.

**Çözüm — `context_strategy: "tokens"` spec genişletmesi:**

```javascript
numeric_fields: [
  {
    path: 'panels[].primary_number',
    required: true,
    extract_numeric_core: true,
    context_window: {
      strategy: 'tokens',         // YENİ — varsayılan 'chars'
      tokens_before: 2,           // YENİ — context_strategy='tokens' iken
      tokens_after: 2,            // YENİ
      chars_before: 6,            // legacy fallback
      chars_after: 6,
    },
  },
],
```

**Algoritma — token-aware extraction:**

Aday string içinde her core için:

1. Core'un index'ini bul (mevcut)
2. String'i whitespace + noktalama (`/[\s,;:.!?()[\]{}<>"]+/`) bazında tokenize et
3. Core hangi token'da yer alıyor, onu işaretle
4. Sol tarafta `tokens_before` tane token al (boş token'ları atla)
5. Sağ tarafta `tokens_after` tane token al (boş token'ları atla)
6. Bu token listesini birleştir, normalize et (whitespace strip + lowercase)
7. KB'de substring olarak ara

Örnek:
- Aday: `n = 240, süre = 999 ay`
- Tokenize: `["n", "=", "240", "süre", "=", "999", "ay"]`
- Core "240" index 2'de
- tokens_before=2 → ["n", "="]
- tokens_after=2 → ["süre", "="]
- Window: `n = 240 süre =` → normalize: `n=240süre=`
- KB'de "n=240" geçiyor ama devamı yok → FAIL → context mismatch ✓

**Avantajları:**

- **Kelime bütünlüğü:** "üre" gibi yarı kelime üretmiyor
- **Paraphrase toleransı:** Eğer body "%50.3 düşüş" yazıyor, KB "%50.3 azalma" yazıyor — token window'da `["%50.3", "düşüş"]` vs KB'de `["%50.3", "azalma"]`. Hala FAIL ama bu doğru: paraphrase yine yakalanır. **Sayı PASS, context yine kontrol edilir.**
- **Format tolerans:** Whitespace farkları normalize ile zaten emiliyor; tokenize bunu netleştiriyor.

**Eksileri:**

- **Hala katı:** Token overlap (synonim toleransı) yok. "azalma" vs "düşüş" semantic olarak eşittir ama lint farkı yakalar. Bu gerçek bir trade-off: tıbbi alanda "azalma" ve "düşüş" eşittir ama legal alanda farklı olabilir. Subdomain bazlı override gerekiyor.
- **Token boundary varsayımları:** Agent "%50.3 düşüş" diye yazdı ama "%50.3düşüş" (boşluksuz) yazsaydı tek token olurdu, doğrulama farklı sonuç verirdi. Bu tipik bir agent çıktısı değil ama edge case.

**İterasyon-7'de uygulanması:**

- `context_window` objesinde `strategy: "chars" | "tokens"` ekle (default `"chars"`, geri uyumluluk)
- `medical-graphical-abstract` subdomain'i için varsayılanı `"tokens"` yap
- Negatif test: hem mevcut chars-based hem token-based davranışı yan yana göster
- Hard fields için tokens, body soft için tokens — tutarlı strateji

### Sinonim toleransı — Token overlap skoru (Level B+)

İterasyon-6 ve 7 deneyimsel olarak gösterdi: outcome body'de paraphrase warning'leri (KB "azalma" → body "düşüş") sürekli üretiyor. Lint **doğru** yakalıyor ama bu warning'ler **agent'ın kasıtlı stilistik tercihi** — KB'nin kelimesini değiştirmek robotvari metinden kaçınmak içindir, halüsinasyon değildir.

Mevcut substring matching paraphrase'ı yakalama açısından "sıfır tolerans" çalışıyor: token "düşüş" KB'de yoksa context FAIL → warning. Bu hard fields için doğru disiplin (regülasyon-grade), ama **soft fields için fazla katı** — agent body'sinin doğal varyasyonunu cezalandırıyor.

**Çözüm — token overlap skoru:**

Context window doğrulama mantığına opsiyonel bir skorlama katmanı eklenir. Substring match yerine:

1. Aday window'u tokenize et
2. Her token için, KB'nin core etrafındaki bölgesinden (extended window) token listesi çıkar
3. **Jaccard benzerliği** veya basit overlap oranı hesapla: `intersect / aday_token_count`
4. Skor `context_match_threshold` (varsayılan 0.5) üstündeyse PASS

**Algoritma — KB extended window:**

KB'de core'un geçtiği konumu bul (literal substring search). Core'un etrafından **belirli bir tokens_radius** (örn. 3-5 token) alanı oku. Bu KB'nin "doğal context'i" olur.

Sonra aday window ile KB extended window arasında token overlap'i hesapla:

```
aday_window  = ["%50.3", "düşüş;"]
kb_window    = ["değerinde", "%50.3", "azalma"]

intersect    = ["%50.3"]
overlap_oran = 1 / 2 = 0.5
```

Threshold 0.5 ise → PASS (tam sınırda).

**Severity hierarchisi (yeniden):**

```
hard fields  → strict substring (mevcut, değişmez)
soft fields  → token overlap skoru (YENİ — paraphrase'a tolerans)
```

Hard fields için sinonim toleransı **eklemiyoruz** — primary_number ve key_stats'ta sayı kesinliği korunmalı, paraphrase yerine literal alıntı zorunlu.

**Spec genişletmesi:**

```javascript
soft_trace_fields: [
  {
    path: 'panels[].body',
    severity: 'warning',
    extract_numeric_core: true,
    context_window: {
      strategy: 'tokens',
      tokens_before: 2,
      tokens_after: 2,
      match_method: 'overlap',          // YENİ — varsayılan 'substring'
      overlap_threshold: 0.5,           // YENİ
      kb_extended_radius: 5,            // YENİ — KB'de core'un etrafında kaç token okunsun
    },
  },
],
```

**Tradeoff'lar:**

- **+** Paraphrase warning'leri azalır, agent doğal yazabilir
- **+** Sinonim için ek altyapı gerekmez (semantic LLM çağrısı yok)
- **−** Halüsinasyon yüzeyi biraz açılır: agent "sayı doğru ama context çok farklı" yazsa overlap 0.5'in altına düşmediği sürece geçer
- **−** Threshold ayarı subdomain'e bağlı; medikal alan 0.7 olmalı, eğitim 0.4 yeterli olabilir
- **−** Eğer KB'de core birden fazla yerde geçerse hangi extended window'u alacağımız belirsiz (önerilen: ilk match)

**Sonuç:** Token overlap skoru **soft layer için** doğru orta yol. Hard layer disiplini korunur. Body warning gürültüsü azalır ama disiplin tamamen kaybolmaz — gerçek halüsinasyon (sayı uydurma) yine yakalanır.

### Best-match KB occurrence (first-match yetersizliği)

İterasyon-8 deneyimsel olarak kanıtladı: bir sayı KB'de birden fazla yerde geçiyorsa **ilk match seçimi yanlış sonuç verir**. Population body'sinde regression bunun delili oldu — "240" KB'de 20+ kez geçiyor, ilk match section 1 metadata'da düşük overlap üretti, oysa section 7'deki narrative'de yüksek overlap olurdu.

**Sorun:**

```javascript
// İterasyon-8 davranışı (yetersiz):
const idx = kbRaw.indexOf(core);  // ← İLK match
// → her zaman aynı occurrence'ı değerlendirir
// → eğer ilk match metadata/index'te ise alakasız context döner
```

**Çözüm — `all_matches` spec genişletmesi:**

```javascript
context_window: {
  strategy: 'tokens',
  match_method: 'overlap',
  overlap_threshold: 0.5,
  kb_extended_radius: 5,
  all_matches: true,            // YENİ — varsayılan true
  match_selection: 'best',      // YENİ — 'first' | 'best' (default)
},
```

**Algoritma — best-match seçimi:**

```
1. KB'de core'un TÜM occurrence'larını bul (indexOf loop ile)
2. Her occurrence için extended window (kb_extended_radius) çıkar
3. Her extended window için aday window ile overlap skoru hesapla
4. EN YÜKSEK skoru veren occurrence'ı seç
5. O skor threshold üstündeyse PASS, altındaysa warning
```

**Performans notu:**

- Tipik medikal abstract KB ~5-10 KB. "240" gibi yaygın sayılar için 20-30 occurrence olabilir
- Her occurrence için extended window extraction + overlap hesabı O(radius) — pratik olarak <1ms
- 6-10 numerik alan x 20 occurrence x 1ms = ~100-200ms tipik artifact için
- Kabul edilebilir; LLM çağrısı yok, deterministic, hızlı

**Trade-off — neden best-match'i default yapıyoruz:**

`first-match` mantıken doğru gibi görünür ("KB'deki ilk geçtiği yer kanonik bağlamdır") ama deneyimsel olarak yanlış: KB'lerde sayılar **önce metadata/tablolarda** sonra **narrative'de** geçer. Metadata bağlamları (`| 240 | 60 |` gibi tablo hücreleri) overlap için zayıf — etrafta anlamlı kelime yok. Narrative bağlamlar ("240 katılımcı dengeli dağıtıldı") overlap için zengin.

`best-match` aslında "agent'a en yumuşak yorumu uygula" demek. Bu bir **pragmatik hatadan kaçınma** — kasıtlı false positive yaratmamak. Hard fields için bu strateji kullanılmıyor (substring match zaten "var mı yok mu" kararı verir, occurrence seçimi alakasız).

**Spec hiyerarşisi (iterasyon-9 sonrası):**

```
hard fields  → substring (occurrence sayısı önemsiz, var/yok kararı)
soft fields  → overlap + best-match KB occurrence
```

**Risk — gizli false negative:**

`best-match` her zaman en yumuşak yorum demek. Eğer agent KB'de hiçbir bağlamda anlamlı olmayan bir sayı yazsa bile **en az kötü** occurrence seçilir. Bu hard fields'a sızmamalı (zaten sızmıyor — hard fields substring kullanır). Soft için kabul edilebilir bir trade-off: amaç paraphrase tolerans, mükemmel halüsinasyon yakalama değil.

### Render katmanı — JSON'dan görsel kart

İterasyon-1 ile 9 arasında pipeline'ın tüm çıktısı JSON oldu. Bu, mühendislik tarafı için yeterli — schema, lint, provenance metadata makine tarafından tüketilebilir. Ancak insanın gözü için bir şey üretilmedi. Doktor JSON okumaz, kart görür.

**Render katmanı ne yapar:**

`output/graphical-abstract.json` → `output/graphical-abstract.html`

HTML çıktı tarayıcıda çift-tıkla açılabilir bir tek dosya olmalı: dependency yok, inline CSS, embedded fontlar (varsa), tek bağımsız artifact. Bu, idea.md'nin "renderer-agnostic JSON" iddiasının pratik kanıtıdır — aynı JSON HTML, SVG, React Native veya başka bir teknolojiyle render edilebilir; ilk implementasyon HTML.

**JAMA / Ibrahim 3-panel triptych görsel düzeni:**

```
┌─────────────────────────────────────────────────────────┐
│  HEADER: title + citation + journal_hint badge           │
├─────────────────┬─────────────────┬─────────────────────┤
│   POPULATION    │  COMPARISON     │     OUTCOME         │
│                 │  (intervention) │                      │
│   [icon]        │   [icon]        │     [icon]          │
│                 │                 │                      │
│   PRIMARY #     │   PRIMARY #     │     PRIMARY #       │
│   (büyük)       │   (büyük)       │     (büyük, vurgu)  │
│                 │                 │                      │
│   body metni    │   body metni    │     body metni      │
│                 │                 │                      │
└─────────────────┴─────────────────┴─────────────────────┘
│  FOOTER: key_stats badges + disclaimer                   │
└─────────────────────────────────────────────────────────┘
```

**Renderer-agnostic spec gereği:**

Renderer **şemayı bilmek zorundadır** ama **şemanın yorumlanmasına müdahale etmemelidir**:

- 3 panel zorunlu — renderer panel array'inden 3'ten az alırsa hata verir
- Panel sırası `position` field'ından okunur (left/center/right)
- `primary_number` her zaman büyük yazılır (visual hierarchy)
- `body` küçük yazıyla, max 3 satır
- `icon_hint` → SVG icon mapping (Phosphor, Heroicons gibi açık kütüphanelerden seçim)
- `key_stats[]` → footer badge'leri olarak yan yana

**Renderer'ın yapmadığı şeyler:**

- Veri uydurmaz — sadece JSON'daki alanları yerleştirir
- Yeniden hesaplama yapmaz — primary_number JSON'dan ne geliyorsa o yazılır
- Şema doğrulaması yapmaz — bu validator'ın işi, renderer JSON'a güvenir
- Lint çalıştırmaz — JSON metadata'sındaki `lint.errors` boş olmalı, renderer artifact'ı render etmeden önce buna bakar; error varsa render'ı reddeder

**Pratik özellik kararları (iterasyon-10 için):**

- **Tek HTML dosyası** (inline CSS, inline SVG icon'lar) — kullanıcı çift tıklar, tarayıcıda açar, paylaşır
- **A4 landscape oranı** — print-friendly, slayt'a kopyalanabilir
- **Renk paleti:** beyaz arka plan, koyu metin, hero metric için tek vurgu rengi (medikal nötr palet — mavi/yeşil)
- **Tipografi:** system-ui (system font stack) — dependency yok
- **Responsive değil — sabit genişlik** (graphical abstract'lar yazdırılmaya yönelik)

**Renderer şemadan bağımsız olduğu için:**

Subdomain başka bir renderer kullanmak isterse (örn. `slides-agent-renderer` veya `react-native-renderer`) sadece JSON'u tüketir, kendi görsel sistemini uygular. Bu, idea.md'nin "studio-agent JSON üretir, render başka katman" mimarisinin somutlaşmasıdır.

**Lint katmanı renderer için:**

Renderer kendi lint kuralları gerektirebilir:
- `panels.length === 3` → render edilebilir
- `panels[].primary_number` boş değil → görsel hiyerarşi bozulmaz
- `header.title` boş değil → ana metin var
- Tüm icon_hint değerleri renderer'ın bildiği bir set'te → fallback ikon ile uyarı

Bu lint kuralları **render-time** çalışır, JSON oluşturma anındaki lint'ten ayrıdır. İlk implementasyonda hata yerine console warning ile uyar, render'a devam et.

### Lint sertleştirme — warning ≠ accept (Karpathy loop disiplini)

İterasyon-3 ile 9 arasında lint katmanı şu şekilde gelişti:
- Hard fields (primary_number, key_stats) → ihlal = error → artifact REJECT
- Soft fields (body) → ihlal = warning → artifact PASS

Bu ayrım pragmatik görünüyordu: body insan-okur metin, paraphrase doğal, warning "fırsat sinyali" olarak yeterli.

**Üçüncü taraf değerlendirmesi (ChatGPT, iterasyon-10 sonrası) bu yaklaşımın temel disiplini ihlal ettiğini gösterdi:**

> *"task.md loop'un özü: failure → instruction refinement. Sende lint warning var ama 'passed: true'. Bu Karpathy loop'a aykırı. Loop'ta bu bir fail sayılmalıydı."*

Eleştiri haklı. "Tatmin edici sonuç alana kadar tekrarla" cümlesi, **warning'lerin de tatmin edici olmadığını** kapsar. Mevcut soft-trace warning'leri (outcome body 3 mismatch) gerçek bulgular — sessizce kabul etmek loop disiplinini bozuyor.

**Yeni davranış (iterasyon-11):**

Lint severity hiyerarşisi yeniden tanımlanır:

```
Severity 'error'   → artifact REJECT, exit code 1
Severity 'warning' → artifact REJECT (yeni — eskiden PASS idi), exit code 2
Severity 'info'    → artifact PASS, log only (gelecek)
```

Soft-trace mismatch artık FAIL üretir. Loop'un mantığı bunu çözmeyi zorunlu kılar:

- Ya body üretimi disipline edilir (KB-yakın yazılır)
- Ya overlap_threshold gevşetilir (bilinçli karar)
- Ya da soft layer kaldırılır (gerçekten body trace istemiyorsak)

"Warning kabul" üçüncü bir yol değildir — disiplin için kapı kapanmalıdır.

**Geri uyumluluk:**

Mevcut altyapı warning'leri "FAIL" olarak işlemediği için kod davranışı değişir. Bu kasıtlı: artifact bir önceki iterasyonda PASS verirken bu iterasyonda FAIL verecek. Sonraki iterasyonlar (12+) bu FAIL'leri çözmek üzere kurulur:

- İterasyon-12: outcome body sadeleştirme → soft FAIL kaybolur
- Veya: spec'te `severity_override: "info"` ile bilinçli "geçici tolerans" mekanizması (acil durum kapısı, default kapalı)

### Body üretim disiplini — JAMA standardı + lint uyumu

İterasyon-11 ile lint katmanı sertleştirildi: soft-trace warning artık FAIL üretiyor. Outcome body 3 mismatch ile FAIL durumunda. Bu üçüncü taraf değerlendirmesinin (ChatGPT) "outcome packed" eleştirisiyle de örtüşüyor:

> *"%50.3 düşüş; p<0.001, r=-0.613 büyük negatif etki — bu 1 panel için fazla bilgi. JAMA'da bu kadar packed olmaz."*

**Sorun teşhisi (iki katmanda birden):**

1. **Lint perspektifi:** Body, KB'nin 3 farklı section'undan veri sentezi yapıyor. Hiçbir tek KB occurrence overlap_threshold'u geçmiyor.
2. **JAMA perspektifi:** Tek panele fazla istatistik sıkıştırılmış. JAMA visual abstract'larında bir panel = bir mesaj prensibi var.

İki sorun aynı çözümde buluşuyor: **body'yi KB-yakın ve sade yaz.**

**JAMA standartına uygun body üretim kuralları (subdomain spesifik):**

`medical-graphical-abstract` subdomain için body şu prensiplere uymalı:

1. **Tek mesaj, tek cümle** — bir panelde max 1 cümle, max 12 kelime
2. **KB-literal yaklaşma** — paraphrase yerine KB'nin kendi cümlesini referans al (lint zaten substring kontrolü yapıyor)
3. **Footer'a delege** — istatistik detayları (p-değeri, etki büyüklüğü, CI) panel body'sinde değil, footer key_stats'ta
4. **Tek section'a yaslan** — body sentez yerine KB'deki tek bir bölümün kısa özeti olmalı
5. **Numerik değerler primary_number'da** — body'de tekrar etmesi gereksiz (visual hierarchy korunur)

**Outcome body örnekleri (mevcut vs yeni):**

```
Mevcut (FAIL, packed, sentez):
"Zaman 1 → Zaman 2 ortanca %50.3 düşüş;
 p<0.001, r=-0.613 büyük negatif etki"

Yeni (PASS, sade, KB-yakın):
"Zaman 1'den Zaman 2'ye ortanca değer %50.3 azalmış"

KB section 7 literal:
"Dramatik Düşüş: Zaman 1→2 arasında ortanca değerde %50.3 azalma"
```

Yeni body 8 kelime, KB section 7 ile %80+ overlap, primary_number'ı tekrarlamıyor (panel zaten "%50.3 azalma" diyor — body bunu açıklıyor değil, contextualize ediyor).

İstatistikler (p<0.001, r=-0.613, d=4.186) zaten footer'da var. Tekrar değil tamamlama.

**Population ve Comparison body'lerine etki:**

Aynı disiplin diğer panellere de uygulanmalı:

```
Population:
- Mevcut: "240 katılımcı, 4 eşit gruba (G1–G4) dengeli dağıtıldı"
- KB-yakın: "240 katılımcı 4 eşit gruba dağıtıldı" (kısa, KB-uyum)

Comparison:
- Mevcut: "Bağımlı iki ölçüm (Zaman 1 vs Zaman 2) Wilcoxon İşaretli Sıralar Testi ile karşılaştırıldı"
- KB-yakın: "Wilcoxon ile bağımlı ölçüm karşılaştırması" (sade, teknik dil)
- Daha sade alternatif: "Aynı katılımcılarda iki ölçüm" (klinik dil, lint için riskli)
```

**Lint riskini ölçmek:**

Her body değişikliğinden sonra lint yeniden çalıştırılmalı. Hedef:
- Hard fields PASS (zaten temizdi, dokunma)
- Soft fields PASS (yeni — body değişikliği bunu sağlamalı)
- Toplam: 0 error, 0 warning → strict modda PASS

Eğer body değişikliği warning'i çözmezse, agent'ın lint mesajını okuyup **hangi exact section'la eşleşmek istediğini** spec'leyerek ikinci tur deneme.

**ChatGPT'nin önerdiği outcome formatı:**

> *"%50.3 azalma (p<0.001) — şuna indir."*

Bu çok sade ama information density açısından iyi. Body olarak alternatif:

```
"Zaman 1'den Zaman 2'ye %50.3 azalma (p<0.001)"
```

10 kelime, KB-yakın, primary_number ile uyumlu, footer ile bağlantılı. Bunu denenmesi gereken bir aday.

### İkinci artifact: clinical-summary (artifact ailesi iddiasını kanıtla)

İterasyon-2 ile 12 arasında pipeline tek bir artifact tipi (`graphical-abstract`) üzerinde derinleşti. Bu, idea.md'nin "önce 1-2 artifact tipini gerçekten doğru yap" disiplinine uygundu. Ama üçüncü taraf değerlendirmesi haklı bir eksikliği vurguladı:

> *"Idea diyor ki 'artifact family'. Ama senin sistem sadece graphical abstract üretiyor. Bu, idea.md'nin %50'sini çöpe atıyor."*

İdea.md gerçekten 4 artifact ailesi tanımlıyor (öğrenme, analiz, sunum, etkileşimli). Tek artifact tipiyle "studio-agent" iddiası yarım kalıyor — ChatGPT'nin tabiriyle *"artifact compiler v0"* olur, studio değil.

**İkinci artifact için seçim — `clinical-summary`:**

`medical-graphical-abstract` subdomain altında **clinical-summary** ikinci artifact tipi olarak eklenir. Bu seçim üç gerekçeyle mantıklı:

1. **Aynı subdomain — paylaşılan altyapı maksimumda kullanılır** (parser, provenance, lint, lint-runner aynen yeniden kullanılır)
2. **Farklı kullanıcı senaryosu** — graphical abstract "3 saniyede ne anlat" için, clinical summary "2-3 dakikada okuyup uygulamaya çevir" için
3. **idea.md'nin "Analiz artifact'ları" ailesinden** (executive memo, FAQ, timeline) — medikal alan için executive memo equivalent'i

**Schema kontratı:**

```javascript
spec = {
  type: 'clinical-summary',
  schema_version: '0.1',  // yeni tip, kendi versionı
  subdomain: 'medical-graphical-abstract',
  format: 'markdown-clinical-memo-v1',
  description: 'Klinisyen okuyucu için tek-sayfalık klinik özet markdown.',
  output_format: 'markdown',
  // ... aynı altyapı
}
```

**İçerik bölümleri (markdown structure):**

```markdown
# Çalışma Başlığı

**Tek cümle çıkarım:** [outcome'un klinik anlamı, 1 cümle]

## Çalışma Tasarımı
- Örneklem: n=240, 4 grup
- Test: Wilcoxon İşaretli Sıralar Testi
- Birincil ölçüm: Zaman 1 vs Zaman 2 ortanca karşılaştırması

## Bulgular
- **Birincil:** Ortanca %50.3 azalma (p<0.001)
- **Etki büyüklüğü:** r = -0.613 (büyük negatif etki)
- **Anlamlılık:** Çift yönlü kanıt (bağımsız + bağımlı analizler)

## Sınırlamalar
- [KB'den çıkarılabilirse]

## Kaynak
- Bağlam: [knowledge-base.md provenance]
```

**Lint kuralları:**

`graphical-abstract`'taki numeric_fields/soft_trace_fields aynı altyapıyı kullanır — sadece path'ler farklı:

```javascript
numeric_fields: [
  { path: 'sections[].bullets[]', required: true, extract_numeric_core: true, ... },
],
```

(Markdown bullet list'lerinde geçen sayılar trace'lenir.)

**Renderer:**

clinical-summary için ayrı renderer gerekmez — markdown bir terminal/text editor'da zaten okunur. İsterse:
- `output/clinical-summary.md` (varsayılan)
- `output/clinical-summary.html` (gelecek — markdown→html dönüşüm)

İlk implementasyonda sadece markdown çıktı yeter.

**CLI etkilenmesi:**

Mevcut compile komutu artık 2 artifact üretebilir:

```bash
# Hepsi
node bin/studio-agent.mjs compile --source knowledge-base.md

# Tek tip
node bin/studio-agent.mjs compile --source knowledge-base.md --artifact graphical-abstract
node bin/studio-agent.mjs compile --source knowledge-base.md --artifact clinical-summary
```

`output/` dizininde 2 dosya:
- `graphical-abstract.json` + `.html`
- `clinical-summary.md`

`compile-report.json` 2 artifact'ı listeler.

**Studio-agent iddiasının kanıtı:**

Bu iterasyondan sonra paket gerçek anlamda "studio-agent" olur:
- Aynı KB'den 2 farklı artifact üretebiliyor (artifact ailesi başlangıcı)
- Her artifact kendi kontratına sahip (schema, lint, format)
- Provenance, halüsinasyon koruma her ikisinde de geçerli (paylaşılan altyapı)
- Subdomain disiplini korunuyor (her ikisi de medical-graphical-abstract)

Bu, ChatGPT'nin *"foundation doğru, ürün eksik"* eleştirisinin "ürün eksik" kısmını kapatır.

### JAMA Internal Medicine gerçek formatı (Ibrahim 3-panel'in ötesinde)

İterasyon-2 ile 12 arasında paket, **Andrew Ibrahim'in Annals of Surgery 2017 formatı**nı (3-panel triptych) referans aldı. Bu format geçerli ama **tarihsel olarak eski** — JAMA Internal Medicine gibi güncel dergiler daha zengin bir layout kullanıyor:

**Gerçek JAMA Internal Medicine formatı — temel özellikler:**

1. **Üstte mavi bar** — dergi adı büyük punto ile (örn. "JAMA Internal Medicine")
2. **Başlık bölümü** — çalışma tipi prefix'i ("RCT:", "Observational:", "Meta-analysis:") + çalışma başlığı
3. **Panel sayısı esnek** — 4-6 panel tipik, **sabit 3 değil:**
   - POPULATION (demografi detayları: yaş, cinsiyet dağılımı)
   - INTERVENTION (ne yapıldığı, dozaj, alt gruplar)
   - FINDINGS (hero metric + gerçek grafik)
   - SETTINGS / LOCATIONS (kaç merkez, hangi ülke)
   - PRIMARY OUTCOME (kapsamlı açıklama)
   - Opsiyonel: SECONDARY OUTCOMES, LIMITATIONS
4. **2-satırlı grid layout** — üstte büyük 3 panel (ana hikaye), altta 2 küçük panel (metodoloji/konum detayı)
5. **Gerçek chart** — sadece ikon değil, **Kaplan-Meier eğrisi**, bar chart, forest plot gibi gerçek istatistiksel grafikler
6. **Altta citation** — makale referansı tam formatta ("Hermine O, Mariette X, et al. JAMA Intern Med. 2020...")
7. **Dergi logosu** — sağ altta © AMA veya dergi brand'i

**Neden önemli:**

- JAMA layout standardı panel sayısını sabit tutmuyor — çalışmanın karmaşıklığına göre esneklik var
- Hero metric FINDINGS panelinde vurgulu (renk + büyük punto) + **gerçek grafik eşlik ediyor**
- Citation olmadan bir "tıbbi görsel özet" eksik kalır — kaynak görünür olmalı

**Yeni schema genişletmesi:**

Graphical-abstract spec'ine yeni alanlar:

```javascript
header: {
  title: "...",
  study_type_prefix: "RCT" | "Observational" | "Meta-analysis" | "Other",
  journal_bar: { name: "JAMA Internal Medicine", color: "#2b6ca3" },
  citation: "...",  // alt citation, gelecek iterasyon
},
layout: {
  type: "grid-2rows" | "single-row",  // eski davranış "single-row"
  top_panels: [...],      // 3 ana panel (Population, Intervention, Findings)
  bottom_panels: [...],   // 1-2 küçük panel (Settings, Methods)
},
```

**Lint kurallarının uyarlanması:**

- `panels.length === 3` kuralı artık **çalışmıyor** (panel sayısı esnek)
- Yeni kural: `panels.length` arasında 3-6
- Role enum genişlet: `population | intervention | comparison | outcome | findings | settings | methods | secondary`
- Hard/soft trace aynen devam (her panelin primary_number + body'si doğrulanır)

**Chart katmanı için ön hazırlık:**

İterasyon-14 **sadece layout** yapacak; gerçek chart (Kaplan-Meier, bar) **iterasyon-15'te** gelir. Şu an FINDINGS panelinde icon yerine bir placeholder SVG veya tek bir sayı vurgusu yeter — layout genişlemesi öncelik.

**PNG çıktı:**

HTML render (iterasyon-10'dan kalma) çalışıyor ama hocanın tercih ettiği format **PNG**. İterasyon-15'te `puppeteer` veya `playwright` ile HTML → PNG dönüşümü eklenecek. Layout genişlemesi tamamlanmadan PNG almak anlamsız — önce layout sabitlensin, sonra PNG.

### Asimetrik JAMA layoutu — FINDINGS panelinin hero konumu

İterasyon-14'te 3+2 eşit grid kuruldu (üstte 3 büyük, altta 2 küçük). Bu JAMA Internal Medicine formatına yakındı ama **temel bir fark gözden kaçırıldı:** JAMA'da FINDINGS paneli *hero konumda* — tek başına iki satır yüksekliği kaplıyor, sağda, chart ile birlikte.

**JAMA'nın gerçek layoutu (Tocilizumab COVID örneği):**

```
┌─────────────┬─────────────┬─────────────┐
│             │             │             │
│ POPULATION  │INTERVENTION │             │
│ (üst, büyük)│(üst, büyük) │  FINDINGS   │
│             │             │  (TAM       │
│             │             │   YÜKSEKLİK │
│             │             │   + CHART)  │
├─────────────┼─────────────┤             │
│ SETTINGS/   │ PRIMARY     │             │
│ LOCATIONS   │ OUTCOME     │             │
│ (alt, küçük)│ (alt, küçük)│             │
└─────────────┴─────────────┴─────────────┘
```

**Yapısal karar:**

FINDINGS panel `hero: true` flag ile işaretlenir → renderer bunu **grid-row: 1 / span 2** ile 2 satır yüksekliğinde yerleştirir. Chart slot'u sadece hero panelde bulunur.

**Yeni panel metadata:**

```javascript
{
  role: 'findings',
  title: 'Findings',
  primary_number: '%50.3 azalma',
  body: '...',
  icon_hint: 'downward-trend',
  hero: true,              // YENİ — tam yükseklik rendering
  chart_slot: 'enabled',   // YENİ — iterasyon-16 için chart yerleştirme alanı
  grid_position: { column: 3, rowStart: 1, rowSpan: 2 },
}
```

**Diğer panellerin pozisyonları:**

- Population: `column: 1, row: 1`
- Intervention/Comparison: `column: 2, row: 1`
- Settings: `column: 1, row: 2`
- Primary Outcome: `column: 2, row: 2`
- Findings (hero): `column: 3, row: 1 / span: 2`

**Grid CSS:**

```css
.panels-grid {
  display: grid;
  grid-template-columns: 1fr 1fr 1.2fr;  /* sağ kolon biraz geniş */
  grid-template-rows: auto auto;
}
.panel-hero {
  grid-row: 1 / span 2;  /* tam yükseklik */
}
```

**Footer temizliği:**

İterasyon-14 footer'ında gereksiz teknik metadata görünüyordu: `schema v1.0 · jama-internal-medicine-v1 · medical-graphical-abstract · 2026-04-20T12:50:53.078Z`. Bu **JSON metadata'da kalsın ama HTML karttan görünmesin.**

Yeni footer sadece şunları gösterir:
- **Key stats badges** (p-değeri, r, d — mevcut)
- **Citation** (tek satır, italic, gri) — academic referans
- **Disclaimer** — "Otomatik üretildi; tıbbi içerik..." (mevcut)
- **Brand** — © Studio Agent (sağ alt)

Teknik metadata (schema version, format, timestamp) JSON'un `_metadata` alanında zaten var; HTML'de gösterilmesi görsel karmaşa yaratıyor.

**Chart slot (iterasyon-16 için hazırlık):**

Findings panelinde chart için ayrılmış bir slot:

```html
<div class="panel-hero">
  <div class="panel-title">FINDINGS</div>
  <div class="panel-primary">%50.3 azalma</div>
  <div class="panel-body">...</div>
  <div class="chart-slot">
    <!-- İterasyon-16'da gerçek chart buraya gelecek -->
    <!-- Şimdilik SVG placeholder (basit ok diyagramı) -->
  </div>
</div>
```

Placeholder şu an: chart_slot'ta **"Slope chart gelecek"** placeholder veya mevcut downward-trend icon'un büyütülmüş hali. Gerçek Kaplan-Meier / slope chart iterasyon-16'nın konusu.

### Slope chart — FINDINGS'in hero görseli

İterasyon-15'te hero panelin chart-slot'ı `placeholder` ile hazırlandı (büyütülmüş icon). İterasyon-16 bu slot'u **gerçek bir istatistiksel chart** ile doldurur.

**Chart tipi seçimi — slope chart:**

Knowledge-base'deki çalışma **bağımlı iki ölçüm** (Zaman 1 vs Zaman 2). Bu veri yapısı için:

- **Slope chart** (seçilen) — iki zaman noktası arası düşüş eğimi. En doğal gösterim.
- Kaplan-Meier — sağkalım verisi için, bizim verimizde yok
- Bar chart — iki değerin basit karşılaştırması, slope kadar hikaye anlatmıyor
- Box plot — yayılım bilgisini gösterir ama KB'de IQR detayları var (min, max, Q1, Q3) — slope chart'ın altında secondary visual olabilir (future)

**KB verileri:**

KB section 4 "Bağımlı Veri Analizi" tablosunda:

```
| Parametre | Zaman 1 | Zaman 2 |
| Ortanca   | 70.456  | 35.047  |
| Minimum   | 41.096  | 18      |
| Maksimum  | 122.588 | 60.283  |
```

Slope chart için ortanca iki noktayı bağlar: `(Zaman 1, 70.456) → (Zaman 2, 35.047)`. Etrafına min-max veya IQR shading eklenebilir (v2 özellik).

**Schema genişletmesi:**

`hero_panel` içine yeni bir `chart` field'ı:

```javascript
hero_panel: {
  role: 'findings',
  ...
  chart: {
    type: 'slope',                    // YENİ — 'slope' | 'bar' | 'box' | 'line' | null
    data: {
      metric: 'Ortanca',
      unit: null,
      points: [
        { label: 'Zaman 1', value: 70.456 },
        { label: 'Zaman 2', value: 35.047 },
      ],
    },
    annotations: [
      { type: 'delta', value: '-%50.3', position: 'between-points' },
    ],
  },
  chart_slot: 'slope',  // 'placeholder' → 'slope' (artık gerçek chart)
},
```

**Render katmanı — inline SVG slope chart:**

Renderer `chart.type === 'slope'` için SVG üretir. Dependency yok (chartjs/d3 değil), sadece SVG primitives:

- X ekseni: iki etiket (Zaman 1, Zaman 2)
- Y ekseni: değer aralığı (otomatik scale — min/max veya fixed range)
- İki nokta birbirine çizgi ile bağlı (accent renk, stroke-width 3)
- Her noktaya daire (accent dolgu)
- Değerler noktaların yanında (küçük metin)
- Delta annotation: iki nokta arasında `-%50.3` etiketi (accent)

**Lint katmanı:**

Chart verisindeki sayılar **hard-trace**:

```javascript
numeric_fields: [
  ...mevcut...,
  {
    path: 'layout.hero_panel.chart.data.points[].value',  // YENİ
    required: true,
    extract_numeric_core: true,
    context_window: { strategy: 'tokens', ... },
  },
],
```

70.456 ve 35.047 KB section 4'te geçtiği için trace PASS olur. Agent uydurma sayı koyarsa lint FAIL.

**Annotations da traced:**

`-%50.3` zaten KB section 7'de geçiyor. `annotations[].value` alanı da soft_trace_fields'a eklenebilir ama opsiyonel — fancy özelliğin gereksiz karmaşa yaratmaması için default dışarıda bırakılabilir.

**Görsel tasarım notu:**

Slope chart **simetrik** olmamalı — Zaman 1 sol, Zaman 2 sağ, Zaman 2 daha aşağıda. Bu görsel "düşüş" hikayesini anlatır. Chart renkleri:

- Line: `#059669` (accent, mevcut)
- Points: dolgulu daire, `#059669`
- Y axis gridlines: hafif gri (#e5e7eb), isteğe bağlı
- Annotation: accent renk, bold

**Chart boyutu:**

hero_panel'in chart-slot alanı (mevcut iter-15'te `min-height: 180px`) bir slope chart için yeterli. SVG `viewBox="0 0 300 180"` veya benzeri.

**Neden slope değil de Kaplan-Meier değil:**

Kaplan-Meier **zaman serisi** gerektirir (birden fazla zaman noktası), bizim verimiz sadece iki nokta. Kaplan-Meier'in görsel karmaşıklığı bu veriyi zenginleştirmez — tam tersi. Slope chart bu çalışma için **doğru abstraksiyon seviyesi**.

Gelecek KB'ler Kaplan-Meier verisi içerirse (örn. time-to-event data, survival), `chart.type: 'kaplan-meier'` eklenir. Şu an gereksiz.

**ChatGPT eleştirisinin diğer kısımları (sonraki iterasyonlarda):**

- *"Single artifact trap"* → İterasyon-13'te ikinci artifact ekleme
- *"Atomic claim binding"* → İterasyon-16'da source_line provenance
- *"Runtime yok"* → İterasyon-17'de intent classification + routing
- *"Context discipline"* → İterasyon-15'te single-section enforcement
- *"Writeback yok"* → İterasyon-14'te writeback raporu

Bu sıralama bağımlılık zinciri ve risk azaltma prensibine göre kuruldu: önce disiplini sıkılaştır (lint), sonra somut iyileştirmeler (body, ikinci artifact), sonra derin yapısal değişiklikler (runtime, line binding).

### KB profile adapter — tek KB'ye fit olmaktan çıkış

İterasyon-16 sonunda paket knowledge-base.md (istatistiksel pre-post rapor) için tek başına kusursuz çalışıyordu. Farklı bir klinik KB (knowledge-base-2.md — JAMA Dermatology "Heads Up" RCT'si, Upadacitinib vs Dupilumab) ile test edildiğinde paket kırıldı:

- `buildFindingsPanel` hâlâ "Zaman 1'den Zaman 2'ye %50.3 azalma" literal string döndürdü — KB2'de böyle bir veri yok
- `buildSettingsPanel` hâlâ "R v4.5.0" döndürdü — KB2'de R sürümü geçmiyor
- `buildComparisonPanel` hâlâ "cov1 vs ref=1" döndürdü — KB2 RCT, T-test değil
- `buildPrimaryOutcomePanel` hâlâ "Wilcoxon İşaretli Sıralar" döndürdü — KB2'nin primary endpoint'i EASI75 week 16
- `extractMedians` "Ortanca | X | Y" tablosu arıyor — KB2'de yok
- `required_sections: ['bagimli-veri-analizi']` — KB2'nin H2'leri farklı
- `detectStudyType` sabit "Statistical Analysis" — KB2 bir RCT

**Teşhis:** Paket tek bir KB şablonuna aşırı fit. Build fonksiyonları "KB'den değer çekiyor" gibi görünse de aslında KB1'in *özel section yapısına* (bağımlı-veri-analizi, ortanca tablosu, cov1) bağlı. Farklı yapıdaki KB için fallback literal string döndürüyor — lint bunu yakaladı (2 err, 1 warn) ve render abort etti. Yani paket yanlış kart göstermedi, ama doğru kart da üretmedi.

**İterasyon-17 çözümü: KB profile adapter pattern**

Paketi *jenerik* iddiası yerine, *bir dizi KB profili için çalışıyor* iddiasına geçir. Her profil için adapter seti:

```javascript
// src/kb-profiles/index.mjs
export function detectKbProfile(wiki) {
  const sections = wiki.sections.map((s) => s.id);
  const content = wiki.raw;

  // RCT profili: primary/secondary endpoint, randomized, treatment groups
  if (
    /randomi[sz]ed|\brct\b|primary\s+endpoint/i.test(content) &&
    sections.some((id) => /primary-endpoint|secondary-endpoints/.test(id))
  ) {
    return 'rct-comparison';
  }

  // Statistical pre-post profili: Zaman 1 vs Zaman 2, bağımlı ölçüm, Wilcoxon
  if (
    /Zaman\s*1.*Zaman\s*2|Bağımlı\s+Veri\s+Analizi|Wilcoxon/i.test(content)
  ) {
    return 'statistical-pre-post';
  }

  return 'generic';  // fallback: en az ekstraksiyon
}
```

**Her profile kendi adapter modülü:**

- `src/kb-profiles/statistical-pre-post.mjs` — mevcut KB1 build fonksiyonları buraya taşınır
- `src/kb-profiles/rct-comparison.mjs` — KB2 için yeni build fonksiyonları
- `src/kb-profiles/generic.mjs` — en minimal, sadece title + population

Her modül şu arayüzü sağlar:

```javascript
export const profile = {
  id: 'rct-comparison',
  study_type_prefix: 'RCT',
  required_sections: ['genel-bilgiler'],  // profile'a özel
  preferred_sections: ['primary-endpoint', 'tanimlayici-istatistikler', ...],
  buildPopulation: (wiki) => ({ role: 'population', ... }),
  buildIntervention: (wiki) => ({ role: 'intervention', ... }),
  buildFindings: (wiki) => ({ role: 'findings', hero: true, chart: {...}, ... }),
  buildSettings: (wiki) => ({ role: 'settings', ... }),
  buildPrimaryOutcome: (wiki) => ({ role: 'primary_outcome', ... }),
};
```

**compile() dispatcher:**

```javascript
export function compile({ wiki }) {
  const profileId = detectKbProfile(wiki);
  const profile = loadProfile(profileId);  // dynamic import
  const payload = {
    header: { title: extractH1(wiki.preamble), study_type_prefix: profile.study_type_prefix, ... },
    layout: {
      top_panels: [profile.buildPopulation(wiki), profile.buildIntervention(wiki)],
      bottom_panels: [profile.buildSettings(wiki), profile.buildPrimaryOutcome(wiki)],
      hero_panel: profile.buildFindings(wiki),
    },
    footer: { ... },
  };
  // interpreter_notes'a profile'ı ekle — izlenebilirlik için
  return { payload, profile: profileId };
}
```

**KB2 için RCT adapter (buildFindings örneği):**

```javascript
// rct-comparison.mjs
function buildFindings(wiki) {
  // Primary endpoint: "EASI75 at week 16"
  // KB2 section 3'te "72.4% vs 62.6%, p=0.007" geçiyor
  const primary = wiki.findSection('primary-endpoint');
  const match = primary?.content.match(
    /(\d+\.\d+)%\s*\(?[^)]*\)?\s*(?:vs|ve|—)\s*(\d+\.\d+)%[^p]*p\s*=?\s*(0?\.\d+)/i,
  );
  if (!match) return fallback();

  const [_, armA, armB, pVal] = match;
  const delta = (parseFloat(armA) - parseFloat(armB)).toFixed(1);

  return {
    role: 'findings',
    title: 'Findings',
    primary_number: `+%${delta}`,  // KB2'de "EASI75'te %10 puan fark" literal olarak var
    body: `EASI75 haftada 16: %${armA} vs %${armB}`,
    hero: true,
    chart: {
      type: 'bar',  // RCT iki kol — slope değil, bar daha uygun
      data: {
        metric: 'EASI75 (%)',
        points: [
          { label: 'Upadacitinib', value: parseFloat(armA) },
          { label: 'Dupilumab', value: parseFloat(armB) },
        ],
      },
      annotations: [{ type: 'delta', value: `+${delta}pp`, position: 'between-points' }],
    },
    secondary_numbers: [{ label: 'p', value: pVal }],
    grid_position: { column: 3, rowStart: 1, rowSpan: 2 },
  };
}
```

**Yeni chart tipi: 'bar'**

RCT için slope chart uygun değil (grup karşılaştırması, zaman değişimi değil). Bar chart eklenmeli:

- İki dikey bar, her biri bir kol
- Yükseklik value ile orantılı, label barın üstünde
- Renk: accent (#059669 her iki bar için veya koyuluk farkı)
- Delta annotation: iki bar arası üstte

Renderer `chart.type === 'bar'` case'i ekler. Slope için mevcut SVG kodu dokunulmaz (KB1 PASS kalır).

**Lint uyumu:**

- `required_sections` artık profile'a özel — global hardcode kaldırılır, `spec.required_sections` dinamik döner (compile'da profile'a göre)
- `numeric_fields` path'leri aynı kalır (hero_panel.primary_number, chart.data.points[].value) — profile'a bakılmaksızın trace disiplini uygulanır
- `panel-roles-valid` enum genişletilebilir: 'intervention_arm_a', 'intervention_arm_b' (şimdilik gerek yok, 'intervention' yeterli)

**Test matrisi:**

İterasyon sonrası:

```bash
# KB1 — mevcut, regresyon yok
node bin/studio-agent.mjs compile --source knowledge-base.md --out output --render html
# BEKLENEN: lint PASS, profile='statistical-pre-post', slope chart, eski çıktıyla birebir

# KB2 — yeni, PASS olmalı
node bin/studio-agent.mjs compile --source knowledge-base-2.md --out output-kb2 --render html
# BEKLENEN: lint PASS, profile='rct-comparison', bar chart, EASI75 primary
```

İki KB de lint PASS verirse paket *iki-profil kapsamında jenerik*. Üçüncü KB (örn. meta-analysis veya cohort study) kırabilir — o zaman üçüncü profile eklenir. Her yeni profile tek bir adapter dosyası.

**Neden bu yaklaşım, neden LLM değil:**

- Deterministik — LLM'in halüsinasyonuna açık değil
- Test edilebilir — her adapter için unit test yazılabilir
- İzlenebilir — `compile-report.json`'a `profile: 'rct-comparison'` eklenir, hangi KB hangi profille işlendi görünür
- Genişletilebilir — yeni profile = yeni dosya, mevcut profile'a dokunmadan

LLM tabanlı çıkarım (future İter-20+) Level C olarak düşünülebilir — profile detection veya field extraction'ı LLM'e delege et. Ama önce rule-based iki profile sağlam oturmalı; LLM *fallback* olarak, ana yol değil.

**Bu iterasyonun kapsamı dışında kalan:**

- PNG render (iter-18)
- Üçüncü profile (cohort, meta-analysis — gerçek KB gelince)
- Atomic claim binding (source_line provenance — iter-19)
- LLM-based extraction (iter-20+)

**Başarı kriteri:** KB1 PASS kalır (regresyon yok), KB2 PASS olur (yeni profile çalışır), `compile-report.json` hangi profile'ın seçildiğini gösterir.

### LLM-based semantic extraction — profile pattern'ın tavanını kırma

İterasyon-17 `kb-profiles/` adapter pattern'ini kurdu. KB1 (`statistical-pre-post`) ve KB2 (`rct-comparison`) için iki ayrı adapter yazıldı. Coding agent'ın kendi raporu şu gerçeği ifade etti:

> "rct-comparison profile'ında drug isimleri (Upadacitinib, Dupilumab) hardcoded. Üçüncü RCT KB'sinde ilaç isimleri farklı olacak."

Yani adapter pattern **jenerik değil** — sadece **N tane özel-çözüm** yazdığımız bir shell. Üçüncü KB (farklı RCT, meta-analysis, cohort study, retrospective chart review) gelince yine kırılır, yeni adapter gerekir. Bu tez boyunca sürdürülemez; paketin iddiası **"herhangi bir tıbbi KB → JAMA-style visual abstract"** ise rule-based yol bu iddiayı karşılayamıyor.

**Kırılma noktası:** Regex ve section-id pattern matching, KB'nin **yapısını** tanır ama **anlamını** tanımaz. "Upadacitinib 30 mg" ve "Rituximab 1000 mg IV" yapısal olarak benzer ama regex'e drug name dictionary gerekir. LLM bu soyutlamayı out-of-the-box sağlar — NER + relation extraction + domain bilgisi.

**İterasyon-18 çözümü: LLM router + Level A/B trace güvenlik ağı**

Paketi **iki mod**a böl:

1. **LLM mode (default):** LLM KB'yi okur → JAMA şemasına uygun JSON döndürür. Her alan için `source_quote` zorunlu.
2. **Rule-based mode (`--mode=rule-based`):** Mevcut profile adapter'lar. Offline çalışır, API key gerekmez, sadece bilinen profile'lar için.

LLM halüsinasyon riski **yeni güvenlik katmanı** gerektirmiyor çünkü Level A/B trace lint disiplini zaten var: LLM "%72.4" dese ve KB'de yoksa, mevcut `numeric-fields-traceable` kuralı FAIL verir. Retry loop bu feedback'i LLM'e geri besler.

**LLM provider cascade (cockpit pattern):**

Tek vendor'a bağımlı kalmamak için provider zinciri:

```
Gemini Flash (primary, free tier 1500/day)
  → OpenRouter (fallback, :free modeller)
    → Cloudflare Workers AI (fallback 2, 10k neuron/day)
```

Her provider tek satır `.env` değişkeni. Biri down/quota olursa diğeri devreye girer. Tümü ücretsiz tier'da kalır → tez için sıfır dolar.

**Extract prompt — deterministik, şematik:**

```
Sen tıbbi literatür analisti asistansın. Aşağıdaki knowledge-base markdown'ı
JAMA Internal Medicine visual abstract şemasına uygun JSON'a dönüştür.

KURALLAR:
1. Her sayısal değer KB'de literal olarak geçmeli. Uydurma.
2. Her alan için source_quote: KB'den birebir cümle alıntısı.
3. primary_number sayı+birim formatında. (örn. "n = 673", "+9.8 puan", "EASI75")
4. body en fazla 15 kelime, KB-literal phrasing.
5. hero_panel'in chart'ı slope (zaman değişimi) veya bar (grup karşılaştırması).

Şema:
{
  "header": { "title": ..., "study_type_prefix": "RCT"|"Cohort"|... },
  "layout": {
    "top_panels": [population, intervention],
    "bottom_panels": [settings, primary_outcome],
    "hero_panel": { findings + chart }
  },
  "footer": { disclaimer, citation }
}

KB:
{{markdown_content}}

JSON döndür. Markdown wrapping yok, sadece geçerli JSON.
```

**Retry loop — targeted feedback:**

```
İlk call → JSON döner
Lint çalıştır → eğer FAIL:
  "Retry. Şu alanlar KB'de bulunamadı: {list}.
   Sadece KB'de birebir geçen değerleri kullan."
Max 3 retry → sonra fallback provider veya rule-based
```

Bu sayede halüsinasyon birinci retry'de yakalanır, ikincide düzelir. Mevcut trace infrastructure'ı tamamen yeniden kullanılır — yeni lint kuralı yok.

**_metadata genişlemesi:**

```json
{
  "_metadata": {
    "extraction_mode": "llm" | "rule-based",
    "llm_provider": "gemini-1.5-flash",
    "llm_retries": 1,
    "llm_cost_estimate_usd": 0.015,
    ...
  }
}
```

Tüketici hangi yolla üretildiğini görür. Rapor şeffaflığı.

**Test matrisi (üç KB):**

- **KB1 (statistical-pre-post):** LLM mode PASS olmalı, rule-based mode ile aynı output. Regresyon yok.
- **KB2 (rct-comparison):** LLM mode PASS, rule-based mode'da da hâlâ PASS (iter-17'den).
- **KB3 (yeni, henüz yok):** Hoca veya kullanıcı farklı bir tıbbi KB verir (örn. bir meta-analysis veya cohort study). **Hiç yeni kod yazmadan** LLM mode PASS vermeli. Rule-based mode `generic` profile'a düşer, zayıf output verir ve bu doğru sinyal.

Başarı kriteri: **KB3 için sıfır yeni adapter**, LLM extraction işini kapatır.

**Cost / risk yönetimi:**

- `extraction.maxRetries = 3` (sonsuz döngü yok)
- `extraction.budgetPerCompileUsd = 0.10` (aşılırsa abort)
- `extraction.timeout = 30000` (provider asılırsa 30sn sonra sonraki provider)
- `extraction.temperature = 0` (tutarlılık; aynı KB → aynı output büyük ölçüde)
- Gemini Flash structured output kullan (`responseSchema`) → JSON parse error riski minimal

**Profile adapter'ların akıbeti:**

Silinmez, deprecate edilmez. `--mode=rule-based` ile çağırılabilir:
- Offline ortamda (internet yok)
- Deterministik regresyon testi için (LLM tutarsızlığı olmadan karşılaştırma)
- API key sorunları sırasında acil fallback

İter-17'de yazılan `statistical-pre-post.mjs` ve `rct-comparison.mjs` olduğu gibi kalır.

**Bu iterasyonun kapsamı dışında kalan:**

- PNG render (iter-19)
- Clinical-summary LLM adaptasyonu (iter-20 — aynı prompt pattern, farklı şema)
- Prompt caching (Anthropic/OpenAI feature — future optimization)
- Fine-tuning (çok uzak, gereksiz karmaşa)
- Offline LLM (Ollama entegrasyonu — gereksiz karmaşa, şimdilik)

**Neden önce LLM'den kaçındık, neden şimdi?**

İter-1 → 17'de **deterministik iskelet** kurduk: parse, lint, trace, renderer, schema discipline. Bu iskelet olmadan LLM ile başlasaydık halüsinasyonu yakalayamazdık — LLM yalan söylerdi, fark etmezdik. Şimdi lint hazır. LLM eklemek **iskelete semantik zeka enjekte etmek**; disiplin zaten var.

Karpathy döngüsünde bu "tool-use as leverage" aşamasıdır: en basit çözüm (regex) problem'i aşana kadar kullan, sonra bir sonraki seviyeye çık. Şu an çıktık.

### JAMA-sadık görsel kimlik — gerçek visual abstract'a yakınsa

İterasyon-18 LLM extraction'ı devreye aldı. KB1'de Groq one-shot PASS, KB2'de halüsinasyon → rule-based fallback. Teknik pipeline çalışıyor ama kullanıcı gerçek dünyada olanı sınadı: **JAMA Dermatology'nin bu makale için yayınladığı resmi visual abstract** ile bizimkini yan yana koydu. Fark dramatik:

| Alan | Gerçek JAMA Dermatology | Bizim iter-18 output'umuz |
|---|---|---|
| Journal bar | **YEŞİL** ("JAMA Dermatology") | MAVİ ("JAMA Internal Medicine" hardcoded) |
| Population | Skin cross-section icon + disease + age range + gender breakdown (375M/298W) | Jenerik `patients-cohort` + "n=673" |
| Intervention | **İki ayrı kol** yan yana — syringe (dupilumab inj) + pill (upadacitinib oral), her biri doz/rota/schedule ile | Tek panel, "Upadacitinib 30mg vs Dupilumab 300mg" |
| Findings chart | **Line chart** — zamana göre iki eğri, error bar, significance marker | Bar chart — iki nokta |
| Findings body | Uzun narrative paragraf + chart + alt satırda detay | Tek satır kısa cümle |
| Icons | Hastalığa özgü (cilt, şırınga, hap, dünya) | Jenerik (`trial`, `lab-setting`, `outcome-measure`) |
| Primary outcome icon | **Yok** (sadece text) | Var (`outcome-measure`) |
| Footer | Minimal citation + © AMA | Disclaimer + brand + extra metadata |

Bu eleştiri **yüzeysel değil** — "Beş saniyede anlaşılır tıbbi özet" hedefinin tam özü: bilgi yoğunluğu + görsel dil + makale tipine sadakat. Bizim kartımız 5 saniyede **yanlış bilgi** iletiyor (Dermatology makalesini Internal Medicine gibi gösteriyor), **eksik bilgi** sunuyor (hastalık adı, yan etki kesiti), ve **jenerik ikonlar** kullanıyor.

**İterasyon-19 hedefi: JAMA'nın visual abstract'ını **klonlayabilir** seviyede görsel kimlik ve veri zenginliği.**

### Değişimin beş ekseni

**1. Journal kimliği dinamik**

`header.journal_bar.name` ve `.color` LLM tarafından KB'den çıkarılır. Makalenin preamble'ında "JAMA Dermatology" varsa → yeşil (`#046e45`); "JAMA Internal Medicine" → mavi (`#2b6ca3`); "JAMA Oncology" → mor; "JAMA Pediatrics" → turuncu; vb. Bilinen JAMA aileleri için statik renk haritası, bilinmeyen journal için fallback gri.

Rule-based mode için preamble regex'i: `JAMA\s+(\w+)` → map'ten renk çek.

**2. Intervention paneli → arms[] array**

Mevcut schema (breaking change):

```javascript
// ÖNCESİ (schema 1.2)
intervention: {
  role: 'intervention',
  primary_number: 'Upadacitinib 30 mg',
  body: 'Upadacitinib 30 mg vs Dupilumab 300 mg',
  icon_hint: 'trial',
}

// SONRASI (schema 2.0)
intervention: {
  role: 'intervention',
  title: 'Intervention',
  arms: [
    {
      label: 'Dupilumab',
      n: 331,
      dose: '300 mg',
      route: 'subcutaneous',
      schedule: 'every other week',
      icon_hint: 'syringe',
    },
    {
      label: 'Upadacitinib',
      n: 342,
      dose: '30 mg',
      route: 'oral',
      schedule: 'once daily',
      icon_hint: 'pill',
    },
  ],
  header_number: 673,  // total — arm sum'ı
  header_label: 'Patients randomized and analyzed',
}
```

Renderer bu array'i **yan yana iki subpanel** olarak çizer, her biri kendi ikonu + metni. JAMA'nın format'ına birebir uyar.

**Backward compatibility:** Eski `intervention` payload'ları (single panel) renderer tarafından yeni şemaya lift edilir — breaking olmaz, additive destek.

**3. Disease panel / population enrichment**

JAMA visual abstract'ında population paneli sadece "n" değil, **hastalık + eligibility + demografi** içerir:

```
POPULATION
375 Men, 298 Women
[skin icon]
Adults aged 18-75 y with atopic dermatitis
symptoms for ≥3 y and EASI ≥16
Mean (SD) age, 36.3 (14.1) y (range, 18-76 y)
```

Schema:

```javascript
population: {
  role: 'population',
  title: 'Population',
  primary_number: '673 Patients',        // veya gender breakdown
  gender_breakdown: { male: 375, female: 298 },   // YENİ opsiyonel alan
  condition: 'moderate-to-severe atopic dermatitis',  // YENİ
  eligibility_summary: 'Adults 18-75 y, EASI ≥16, ≥3 y symptoms',  // YENİ
  age_summary: 'Mean 36.3 (SD 14.1) y, range 18-76',  // YENİ
  icon_hint: 'skin-cross-section',  // hastalık-spesifik
}
```

Renderer bu alanları üst üste satırlar halinde dizer.

**4. Line chart desteği**

`hero_panel.chart.type` için yeni değer: `'line'`. Veri yapısı:

```javascript
chart: {
  type: 'line',
  data: {
    metric: 'EASI75 achievement',
    unit: '%',
    x_axis: { label: 'Week', values: [0, 1, 2, 4, 8, 12, 16] },
    y_axis: { label: 'Proportion of patients (%)', min: 0, max: 100 },
    series: [
      { label: 'Upadacitinib (n=342)', values: [0, 16.1, 44.3, 71.1, 78, 75, 72.4], color: '#046e45' },
      { label: 'Dupilumab (n=331)', values: [0, 5.8, 18.2, 37.3, 53, 58, 62.6], color: '#888' },
    ],
  },
  annotations: [
    { type: 'significance', week: 16, level: 'a' },  // p<0.001
    { type: 'delta', value: '+9.7pp', position: 'week-16' },
  ],
}
```

Renderer inline SVG line chart üretir — dependency yok:
- X axis: week labels
- Y axis: scaled to min/max
- Her seri için: çizgi (stroke) + noktalar (filled circles) + label at right
- Error bar opsiyonel (future)

**Hangi chart ne zaman:**

- **slope:** iki zaman noktası (pre/post), tek değer serisi. KB1 tipik.
- **bar:** iki grup, tek zaman noktası. Group comparison.
- **line:** çok zaman noktası, iki+ grup. RCT efficacy-over-time.

LLM prompt'a eklenir: "Eğer veri `week 1, 2, 4, 8, ..., 16` gibi çoklu zaman noktası içeriyorsa `line` kullan; tek-nokta iki-grup için `bar`; iki-nokta tek-grup için `slope`."

**5. Icon sistemi — Lucide curated set**

Mevcut `icon_hint` string'leri (örn. `patients-cohort`, `trial`) renderer'da inline SVG path'ine map'leniyor — yaklaşık 8 icon. Bu yetmiyor.

**Çözüm:** Lucide icon library'den curated set (~40 ikon) derlenir. `src/renderer/icons.mjs` dosyası:

```javascript
export const ICON_LIBRARY = {
  // Patient / population
  'patients-cohort': '<svg>...</svg>',
  'skin-cross-section': '<svg>...</svg>',
  'brain': '<svg>...</svg>',  // psikiyatri
  'heart': '<svg>...</svg>',  // kardiyoloji
  'lungs': '<svg>...</svg>',  // pulmonoloji
  'baby': '<svg>...</svg>',   // pediatri
  
  // Intervention — route
  'syringe': '<svg>...</svg>',      // injection
  'pill': '<svg>...</svg>',         // oral tablet
  'capsule': '<svg>...</svg>',      // capsule
  'iv-drip': '<svg>...</svg>',      // intravenous
  'inhaler': '<svg>...</svg>',      // inhalation
  'scalpel': '<svg>...</svg>',      // surgery
  'stethoscope': '<svg>...</svg>',  // general clinical
  
  // Findings / outcome
  'downward-trend': '...',
  'upward-trend': '...',
  'bar-comparison': '...',
  'line-chart': '...',
  'survival-curve': '...',
  
  // Settings
  'globe': '...',            // multi-country
  'hospital': '...',         // single/few centers
  'lab-setting': '...',
  
  // Generic fallback
  'stethoscope': '...',
};
```

LLM prompt'a **icon enum** eklenir — LLM bu listeden seçer, uydurma. Lint kuralı: `icon-hint-valid` → `ICON_LIBRARY` içinde olmak zorunda. Olmayan icon_hint kullanımı error.

Lucide [lucide.dev](https://lucide.dev) MIT lisans, 1400+ SVG ikon — curated subset alınır, license belirtilir.

### Schema version bump — 1.2 → 2.0

Breaking değişiklikler:
- `intervention.primary_number` → `intervention.arms[]`
- `population` zenginleşmesi (opsiyonel alanlar, backward-compat)
- `hero_panel.chart.type: 'line'` enum genişlemesi
- Renderer'da yeni panel layouts (intervention subpanel split)

`schema_version: '2.0'`. İter-17'deki profile adapter'lar güncellenmeli — `statistical-pre-post.mjs` ve `rct-comparison.mjs` yeni şemaya geçer. LLM prompt'ı yeniden yazılır. Rule-based mode'da arms[] tek elemanlı olabilir (fallback) veya profile KB'den iki arm çekebiliyorsa iki elemanlı.

### Başarı kriterleri

1. **Görsel sadakat:** KB2'den üretilen HTML, orijinal JAMA Dermatology visual abstract'ına gözle bakıldığında "aynı aileden" hissi vermeli:
   - Yeşil JAMA Dermatology bar
   - RCT prefix
   - Intervention iki kol (syringe + pill)
   - Line chart zamana göre
   - Skin icon population'da
   - Globe icon settings'te

2. **Veri zenginliği:** Gender breakdown, age range, disease name, eligibility summary HTML'de görünür. Sadece "n=673" değil.

3. **Chart doğruluğu:** Line chart 4-7 zaman noktası gösterir (week 0-16), iki seri, accent renk kontrastı.

4. **Regresyon:** KB1 (statistical pre-post) yine geçerli output verir — slope chart korunur, `intervention.arms[]` tek elemanlı fallback ile.

5. **Lint:** Chart veri değerleri (line chart'ın Y değerleri), arms[].dose, gender_breakdown sayıları hepsi `numeric-fields-traceable` ile trace'lenir. KB'de olmayan sayı → FAIL.

### Kapsam dışı (iter-20+'a)

- **Üçüncü farklı alan KB'si** (cerrahi/pediatri/onkoloji) — dinamik ikonun gerçek testi. Bu iter-19'da KB2 bağlamında test edilir, iter-20'de yeni KB ile kanıtlanır.
- **Clinical-summary şema uyumu** — iter-19 sadece graphical-abstract odaklı
- **PNG export** — iter-21 veya sonrası
- **Error bars + significance markers** line chart'ta — line chart v1 basit kalır, v2'de zenginleşir

### Uyarı — bu büyük iterasyon

İter-17 ve iter-18 additive idi. Bu **breaking change** (schema 2.0). Profile adapter'lar, LLM prompt, renderer, lint kuralları, hepsi güncellenmeli. Risk yüksek: KB1 regresyonu çok kolay kaçırılabilir. Test matrisi sıkı olmalı:

```bash
# KB1 rule-based regresyon — slope chart, tek arm intervention
node bin/studio-agent.mjs compile --source knowledge-base.md --mode=rule-based --out output

# KB1 LLM regresyon — aynı sonuç seviyesi
node --env-file=.env bin/studio-agent.mjs compile --source knowledge-base.md --out output-llm

# KB2 rule-based — iki arm intervention, bar chart, iter-17 davranışı
node bin/studio-agent.mjs compile --source knowledge-base-2.md --mode=rule-based --out output-kb2

# KB2 LLM — line chart, dinamik journal, skin icon, iki arm
node --env-file=.env bin/studio-agent.mjs compile --source knowledge-base-2.md --out output-kb2-llm
```

Hepsi lint PASS vermeli. KB2 LLM çıktısı gerçek JAMA Dermatology visual abstract'ına yan yana konulduğunda **görsel olarak tanınabilir benzerlik** göstermeli.

### Structural recipe — JAMA'nın 8-slot haritası (ezberi kırma)

İterasyon-18/19 LLM router'ı ve schema 2.0 görsel zenginliğini getirdi ama ezberi kırmadı. Agent iter-19 raporunda kendisi itiraf etti: `rct-comparison` profile drug isimlerini ("Upadacitinib", "Dupilumab") 11 yerde hardcoded kullanıyor. LLM path iki denemede de provider'lar tükenip rule-based'a düştü. Sonuç: güzel görünen KB2 output aslında **KB2'ye özel ezber**. Üçüncü bir paper (farklı ilaçlar, farklı alan) kırardı.

**Kullanıcı keskin teşhis koydu:** "benim visual abstract yalnızca 1-2 KB dosyasına göre özet çıkarıp abstract'ı çıkarmamalı bu yapı dinamik olmalı verilen girdinin özeti çıkarılarak 5 sn bakınca anlanacak şekilde bir JAMA formatında visual abstract çıkmalı."

Hardcoded drug isimlerini kaldırmak yeterli değil. Asıl sorun: sistem JAMA visual abstract'ın **yapısal reçetesini** bilmiyor. Her paper'da hangi slot'un hangi paper bölümünden geldiği sabittir; LLM'e ve rule-based extractor'lara bu mapping öğretilmeli.

### JAMA visual abstract'ın 8 sabit slot'u

Üç farklı JAMA visual abstract (Upadacitinib/JAMA Dermatology, MI Training/JAMA Network Open, ETC Dialysis/JAMA Health Forum) karşılaştırıldığında her paper'da **aynı 8 slot aynı paper bölümünden** beslendi:

| # | Visual Abstract Slot | Paper'da Kaynak (Sabit) |
|---|---|---|
| 1 | **Journal bar** | İlk sayfa header + citation satırı (journal adı) |
| 2 | **Title + RCT/Cohort prefix** | Paper ana başlığı + alt başlığı (alt başlık → prefix) |
| 3 | **POPULATION** | Gender/age → RESULTS §1; eligibility → DESIGN, SETTING, AND PARTICIPANTS |
| 4 | **INTERVENTION (arms[])** | INTERVENTIONS bölümü + CONSORT/RESULTS §1 (arm sayıları) |
| 5 | **SETTINGS / LOCATIONS** | DESIGN, SETTING, AND PARTICIPANTS ilk cümle |
| 6 | **PRIMARY OUTCOME** | MAIN OUTCOMES AND MEASURES — tanım cümlesi (sonuç değil) |
| 7 | **FINDINGS** | Key Points → Findings (narrative) + RESULTS (stats) + Table (chart data) |
| 8 | **Footer citation** | Paper bibliografik satırı (alt kısım) |

Bu tablo paper'ın ne hakkında olduğundan bağımsız. Üç farklı paper — drug RCT, behavioral training, policy RCT — tamamen farklı alanlar ama **aynı recipe**.

### Değişen içerik kuralları — adaptive rendering

Slotlar sabit, içerik adaptif. Üç paper karşılaştırmasından çıkan kurallar:

**Chart tipi seçimi — outcome yapısına göre**
- **Slope chart:** iki zaman noktası, tek değer serisi (pre/post — KB1 tipi)
- **Bar chart:** iki grup, tek zaman, anlamlı fark (group comparison efficacy)
- **Line chart:** çoklu zaman noktası, iki+ grup (efficacy over time — Upadacitinib)
- **Donut chart × 2:** iki grup, tek zaman, **null result** (MI Training, ETC Dialysis)
- **Kaplan-Meier/step:** survival data

**Intervention arm icon — modaliteye göre**
- **Drug trial:** route-specific (oral → pill, subcutaneous → syringe, IV → drip)
- **Behavioral/training:** clipboard, conversation, document
- **Policy/financial:** money, contract, seal
- **Device/surgery:** scalpel, device
- **Null control:** prohibition sign ∅ veya blank
- **Paper'dan çıkarım:** INTERVENTIONS bölümündeki cümleye keyword match

**Population icon — hastalık türüne göre**
- **Organ-specific disease** (dermatit, böbrek, kalp, akciğer) → organ anatomy icon
- **Demografi merkezli** (pediatri, geriatri) → insan figürü
- **Systemic/metabolic** → sistem ikonu (kan damlası, vb.)

**Settings icon — scope'a göre**
- **Single-center** → hospital building
- **Multi-center, tek ülke** → network / state map
- **Multi-country** → globe

**Intervention header — randomization unit'a göre**
- **Individual RCT** → "N Patients randomized and analyzed"
- **Cluster RCT** → "N Hospitals/HRRs/Schools randomized" (cluster ismi + sayı)
- **Paper'dan çıkarım:** DESIGN'daki "cluster randomization at X level" ifadesi

### LLM prompt'ın yeniden yazımı

İter-18'deki LLM prompt "JAMA şeması" tanımladı ama her slot için paper'ın HANGİ bölümünden extract edileceğini söylemedi. Sonuç: LLM serbest-form özet üretti, hallucination yakalandığında düzeltemedi.

Yeni prompt kontratı **slot-bazlı, section-aware**:

```
Her slot için sadece şu paper bölümünden extract et. Başka bölüme bakma.

SLOT 1 (header.journal_bar.name): İlk sayfa header + citation satırı
SLOT 2a (header.title): Paper ana başlığı
SLOT 2b (header.study_type_prefix): Paper alt başlığından çıkar (RCT/Cohort/Meta-analysis/...)
SLOT 3a (population.primary_number): RESULTS §1'den gender breakdown
SLOT 3b (population.condition): DESIGN, SETTING, AND PARTICIPANTS'tan hastalık
SLOT 3c (population.age_summary): RESULTS §1'den mean (SD) age
SLOT 3d (population.eligibility_summary): DESIGN veya Methods'tan eligibility kriteri
SLOT 3e (population.icon_hint): condition keyword'üne göre organ/demographic map
SLOT 4a (intervention.header_label): CONSORT veya RESULTS §1'den total N (patient veya cluster)
SLOT 4b (intervention.arms[]): INTERVENTIONS bölümünden her kol ayrı ayrı
SLOT 4c (intervention.arms[].icon_hint): kolun modalitesine göre (drug route, behavioral, policy)
SLOT 5a (settings.primary_number): DESIGN'dan site sayısı veya lokasyon özeti
SLOT 5b (settings.icon_hint): scope (single-center/multi-center/international) göre
SLOT 6 (primary_outcome.body): MAIN OUTCOMES AND MEASURES'ın ilk cümlesi (DEFINITION, sonuç DEĞİL)
SLOT 7a (hero_panel.body): Key Points → Findings kutusu NARRATIVE
SLOT 7b (hero_panel.chart): RESULTS + Table verisi; chart.type outcome yapısına göre (slope/bar/line/donut)
SLOT 7c (hero_panel.secondary_numbers): RESULTS → Primary Outcome §'daki OR/p/CI
SLOT 8 (footer.citation): Paper bibliografik satırı
```

LLM her slot'u doğrularken "KB'nin hangi bölümünden aldım" source_quote'unu zorunlu vermeli. Lint bu quote'u KB'de doğrular — yoksa reject + retry feedback o slot'u hangi section'dan tekrar denemesi gerektiğini söyler.

### Rule-based extractor'ların refactor'ü

İter-17'deki `rct-comparison.mjs` drug isimlerine bağımlı. Yeni yaklaşım: **section-first, content-second**.

Her extractor önce paper'ın ilgili section'ını bulur, sonra içinden değer çıkarır:

```javascript
// ÖNCESİ (KB2'ye ezberli)
function buildFindings(wiki) {
  const m = primary.content.match(/Upadacitinib\s*%(\d+\.\d+)[^v]*vs\s*Dupilumab/);
  // ...
}

// SONRASI (section-aware, drug-agnostic)
function buildFindings(wiki) {
  const primaryEndpointSection = findSection(wiki, /primary.endpoint|primary.outcome/i);
  const resultsRow = findTableRowWithPValue(primaryEndpointSection);
  const narrative = findKeyPointsSection(wiki, 'findings');
  return {
    body: narrative.text,           // KB'nin Key Points'inden
    chart: selectChartType(resultsRow),
    secondary_numbers: extractORCI(resultsRow),
  };
}
```

Section bulma regex'leri hastalık/ilaç bağımsız — sadece paper yapısına bağlı.

### Chart type selector — kural-tabanlı

```javascript
function selectChartType(resultsData) {
  // Çoklu zaman noktası varsa line
  if (resultsData.timePoints && resultsData.timePoints.length > 2) return 'line';
  // Null result 2-group comparison → donut × 2
  if (resultsData.groups === 2 && resultsData.pValue > 0.05) return 'donut';
  // Paired pre/post → slope
  if (resultsData.pre && resultsData.post) return 'slope';
  // İki grup anlamlı fark → bar
  if (resultsData.groups === 2) return 'bar';
  return 'bar';  // fallback
}
```

### Donut chart renderer

Paper 3 (MI) ve Paper 4 (ETC) null result için iki donut gösterdi. Bu chart tipi eksikti — eklenir. SVG inline, iki daire yan yana, her biri dolu yay ile orantıyı gösterir, ortada yüzde etiketi.

### Icon taxonomy modülü

`src/renderer/icon-taxonomy.mjs` — keyword match ile icon seçer:

```javascript
export function detectPopulationIcon(condition) {
  if (/dermatit|psoriasis|eczema|skin/i.test(condition)) return 'skin-cross-section';
  if (/kidney|renal|esrd|dialys/i.test(condition)) return 'kidney';
  if (/cardi|heart/i.test(condition)) return 'heart';
  if (/pediatr|youth|adolescent|child/i.test(condition)) return 'users-group';
  // ...
  return 'patients-cohort';  // fallback
}

export function detectInterventionIcon(armText) {
  if (/oral|tablet|once.daily|po\b/i.test(armText)) return 'pill';
  if (/subcutaneous|injection|syringe/i.test(armText)) return 'syringe';
  if (/intravenous|iv.drip|infusion/i.test(armText)) return 'iv-drip';
  if (/training|counseling|interview/i.test(armText)) return 'conversation';
  if (/financial|incentive|payment/i.test(armText)) return 'money';
  if (/usual.care|standard|tau|control/i.test(armText)) return 'clipboard';
  if (/no.intervention|placebo/i.test(armText)) return 'prohibition';
  // ...
  return 'clipboard';
}

export function detectSettingsIcon(scopeText) {
  if (/multi.countr|international|global/i.test(scopeText)) return 'globe';
  if (/multi.center|(\d+)\s*centers|nationwide/i.test(scopeText)) return 'network';
  return 'hospital';
}
```

### Ezberin kanıtı: retry feedback'in güçlenmesi

Mevcut LLM retry feedback sadece "lint error sayısı" gönderiyor. Yeni: **hangi slot, hangi paper bölümünden yeniden alınsın** explicit söylenir:

```
Retry feedback:
- SLOT 7c (hero_panel.secondary_numbers): değer "p=0.89" KB'de bulunamadı.
  Doğru kaynak: RESULTS → Primary Outcome paragrafı.
  KB extract'ı: "mean (SD) share... 0.12 percentage points higher (95% CI, −1.42 to 1.65; P = .89)"
  Bu paragraftaki değeri kullan.
```

Bu feedback LLM'e **nerede yanlış yaptığını ve nereden düzeltmesi gerektiğini** söyler. Hallucination → targeted correction → ikinci attempt başarı.

### Başarı kriteri

Bu iterasyon sonunda paket şu iddiayı taşır:

> "JAMA-style tıbbi paper markdown'ı verilince, structural recipe'e göre her slot ilgili paper bölümünden extract edilir. Drug adı/hastalık/alan ne olursa olsun 8-slot mapping korunur. Rule-based mode ezber değil, section-aware. LLM mode her slot için source_quote zorunlu, hallucination retry feedback ile targeted düzeltilir."

Test: KB2 LLM mode'da çalıştığında hardcoded fallback'e düşmeden **tek başına** PASS vermeli. `_metadata.llm_provider` gerçek bir provider göstermeli (fallback değil).

### Kapsam dışı (sonraki iterasyonlara)

- PNG export (iter-21)
- Clinical-summary schema 2.0 + LLM uyumu (iter-22)
- 3. farklı paper ile gerçek jeneriklik testi (iter-23)
- Meta-analysis, cohort study, diagnostic accuracy için ek chart tipleri (iter-24+)

### Provenance binding — halüsinasyonu kodla imkansız kıl (içerik > görünüm)

İterasyon-20 ezberi kırdı: drug-name hardcoding silindi, LLM KB2'yi tek-shot extract etti. Ama içerikle ilgili asıl sorun hâlâ yaşayabilir: *"LLM doğru değeri yazsa bile, yanlış slot'a koyabilir veya çeviri/özetleme ile KB-dışı bir metin üretebilir."*

Kullanıcı odağı netleştirdi: **"görünüm değil, içeriğe odaklanalım. içeriğin düzgün özetlenip bölümlenmesine."**

Bu iterasyon ikon seçimi, chart rendering, CSS polish gibi **görünsel derivation**'ları tamamen pas geçer. Sadece bir soruya odaklanır:

> **"Output JSON'daki her değer, KB'nin neresinden geldi ve bunu mekanik olarak kanıtlayabilir miyim?"**

Şu ana kadar Level A/B trace (sayısal değerler + tokenized context) halüsinasyonun büyük kısmını yakaladı. Ama:

- **Text field'lar** (condition, eligibility, body cümleleri) soft warning seviyesinde — LLM KB-yakın ama KB-değil bir cümle yazsa lint geçerdi
- **Slot-section mapping** doğrulanmıyor — LLM primary_outcome.body'ye Findings narrative'i koysa yakalanmaz (iki section'ın içerikleri birbirine benzer)
- **Provenance yokluğu** — payload'a bakınca "bu değer KB'nin hangi satırından geldi?" sorusunun cevabı yok

### Çözüm: `_metadata.provenance` — her field için zorunlu source binding

Her field için üç soru cevaplanır:

1. **value** — ne yazıyor?
2. **source_quote** — KB'de literal olarak hangi cümleden geldi?
3. **kb_section** — KB'nin hangi section'ı altında?

Bu üçü additive bir `_metadata.provenance` objesinde path-indexed saklanır:

```json
{
  "_metadata": {
    "provenance": {
      "header.title": {
        "source_quote": "Heads Up — Upadacitinib vs Dupilumab Klinik Çalışması",
        "kb_section": "preamble"
      },
      "layout.top_panels[0].condition": {
        "source_quote": "Moderate-to-Severe Atopic Dermatitis (AD)",
        "kb_section": "1. GENEL BİLGİLER → Hastalık"
      },
      "layout.top_panels[0].age_summary": {
        "source_quote": "Mean (SD) 36.3 (14.1) y",
        "kb_section": "1. GENEL BİLGİLER → Örneklem"
      },
      "layout.hero_panel.body": {
        "source_quote": "Demonstrated clinically meaningful skin clearance and itch relief, with statistically significant superiority for upadacitinib compared with dupilumab",
        "kb_section": "7. INFOGRAFİK / VISUAL ABSTRACT İÇİN ANAHTAR MESAJLAR"
      }
    }
  },
  "header": { "title": "Heads Up — Upadacitinib vs Dupilumab Klinik Çalışması", ... },
  "layout": { ... }
}
```

Payload yapısı **değişmez** — geriye uyumlu. Provenance ayrı bir metadata alanı, renderer onu görmez.

### Lint kuralı: `provenance-binding` (strict)

Her field için üç zincirli doğrulama:

```
FOR EACH path IN provenance:
  1. value = payload[path]              (must exist in payload)
  2. value ⊂ source_quote               (normalized substring match)
  3. source_quote ⊂ kb.raw              (literal substring in KB)
  4. kb_section ∈ kb.sections ∪ {'preamble', 'title', 'derived'}
```

Herhangi biri fail → lint error. Halüsinasyon olmaması için şu mekanik garantiler:

- **value KB'de literal olmalı** (adım 2 + 3'ün zinciri sayesinde)
- **slot-section eşlemesi doğru olmalı** (adım 4: bilinmeyen section_id yasak)
- **eksik veri `null`** (provenance'ı olmayan field yok; yoksa `null` veya field hiç yazılmıyor)

"derived" özel section_id — ikon seçimi, chart tipi, journal rengi gibi **rule-based derivation** alanları için (KB'den direct extract değil, kural-tabanlı seçim). Bu alanlar strict binding'den muaf.

### LLM prompt değişikliği

LLM'e explicit söylenir:

```
ZORUNLU: Her ürettiğin field için _metadata.provenance objesine şunu ekle:
  {
    "<path>": {
      "source_quote": "<KB'den BİREBİR alıntı>",
      "kb_section": "<KB'deki section başlığı veya 'preamble'>"
    }
  }

source_quote MUTLAKA KB markdown'da LİTERAL olarak geçmeli. Özet, parafraz, çeviri YASAK.
Eğer bir field için KB'de karşılık bulamazsan: o field'ı payload'a YAZMA (null veya yok).

Derivation alanları (ikon/chart/renk) istisna: kb_section="derived" yaz.
```

### Rule-based extractor'lar için provenance

İter-20'deki section-aware extractor'lar zaten hangi section'dan çektiğini biliyor. Minor değişiklik: her extractor çıkarırken provenance da döndürür:

```javascript
function buildPopulation(wiki) {
  const general = findSection(wiki, /genel-bilgiler/i);
  const match = general.content.match(/\*\*Condition:\*\*\s*(.+)/);
  if (!match) return { value: null, provenance: null };

  return {
    value: match[1].trim(),
    provenance: {
      source_quote: match[0],  // full match — literal KB metni
      kb_section: general.title,
    },
  };
}
```

`compile()` bu objelerden `payload` + `_metadata.provenance` ikilisini construct eder.

### Rule-based mode otomatik PASS — LLM mode'a sınav

- **Rule-based:** provenance doğrudan KB'den geliyor, lint garanti PASS
- **LLM:** LLM'in source_quote'ları KB'de literal aramayabilir (çeviri/özet içgüdüsü) → lint FAIL → retry feedback

Retry feedback artık **slot-level + provenance-level** targeted:

```
SLOT 3b (population.condition): "moderate-to-severe atopic dermatitis"
source_quote: "Moderate-to-Severe Atopic Dermatitis" — KB'DE BULUNAMADI.
KB'de geçen literal hali: "**Condition:** Moderate-to-Severe Atopic Dermatitis (AD)"
Yeniden dene: source_quote'u KB'den BİREBİR al.
```

Bu mekanizma halüsinasyonu sıfıra indirir (teoride): ya LLM KB-literal üretir, ya lint reject eder. Üçüncü yol yok.

### Bu iterasyon ÖNEMLİ OLMAYAN şeyler

- **Icon seçimi** — `kb_section: "derived"` ile bypass
- **Chart tipi** — derived, bypass
- **Journal rengi** — derived, bypass
- **CSS / layout / renderer polish** — dokunulmaz
- **Donut chart render detayı** — iter-20'den kalma, dokunulmaz
- **PNG export** — kapsam dışı
- **3. farklı KB testi** — kapsam dışı (provenance mekanizması önce kanıtlanmalı)

### Başarı kriteri

1. **KB1 + KB2 rule-based:** lint PASS, `_metadata.provenance` tüm field'lar için dolu, kb_section'lar gerçek section isimlerine matching
2. **KB2 LLM mode:** lint PASS, LLM source_quote'ları KB'de literal geçiyor, provenance paths payload'daki her meaningful field'a matching
3. **Hallucination audit:** output JSON'da `_metadata.provenance`'ı olmayan field YOK (derived'lar hariç). Random manuel denetim: 5 field seç, value → source_quote → KB zincirini elle doğrula
4. **Regresyon:** görsel çıktı (HTML) aynı — renderer değişmedi, provenance'ı kullanmıyor

İçerik sağlam olunca görünüm iterasyon-22+'da polished edilir (donut test, PNG, 3. KB). Ama **sıra bu**: önce içerik garantisi.

## Not

Bu doküman kasıtlı olarak soyuttur. Artifact türlerinin tam listesi, schema formatı, publish API'si, HTML artifact render katmanı, slides veya audio pipeline entegrasyonu, stale detection mekanizması, provenance frontmatter şeması — bunların hepsi mevcut kod tabanına, altyapıya ve alan riskine bağlıdır.

Bu idea file, studio-agent'ın ne yapması gerektiğini ve ne olmaması gerektiğini hizalamak için vardır; tek bir uygulama reçetesi vermek için değil.

Bu dokümanı LLM ajanına ver, mevcut repo state'ini okumasını iste ve birlikte ilk küçük ama gerçek artifact ailesini seçin. Önce bir veya iki artifact tipini gerçekten doğru yapın. Merkez kaybolursa ürün, uzun cevap üreten bir chatbot'a döner. Merkez korunursa, wiki zamanla bir studio'ya dönüşür.
