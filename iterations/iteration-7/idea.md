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

## Not

Bu doküman kasıtlı olarak soyuttur. Artifact türlerinin tam listesi, schema formatı, publish API'si, HTML artifact render katmanı, slides veya audio pipeline entegrasyonu, stale detection mekanizması, provenance frontmatter şeması — bunların hepsi mevcut kod tabanına, altyapıya ve alan riskine bağlıdır.

Bu idea file, studio-agent'ın ne yapması gerektiğini ve ne olmaması gerektiğini hizalamak için vardır; tek bir uygulama reçetesi vermek için değil.

Bu dokümanı LLM ajanına ver, mevcut repo state'ini okumasını iste ve birlikte ilk küçük ama gerçek artifact ailesini seçin. Önce bir veya iki artifact tipini gerçekten doğru yapın. Merkez kaybolursa ürün, uzun cevap üreten bir chatbot'a döner. Merkez korunursa, wiki zamanla bir studio'ya dönüşür.
