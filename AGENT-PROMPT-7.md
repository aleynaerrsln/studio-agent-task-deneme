# İterasyon-7 — Token-aware context window

> **Kullanım:** Bu dosyanın TAMAMINI mevcut Claude Code oturumuna tek mesaj olarak yapıştır.

---

## Bağlam

İterasyon-6'da soft-trace warning katmanı eklendi ve **outcome body'sinde 3 paraphrase mismatch** yakalandı:

- `50.3@"anca %50.3 düşüş"` (KB "azalma", body "düşüş")
- `0.001@"üş; p<0.001, r=-0"`
- `-0.613@"01, r=-0.613 büyük"`

Senin önceki rapordaki kritik gözlem:

> *"context_window: { chars_before, chars_after } şu üç sorunu var: kelime ortasında kesim ('üre = 12 ay'), KB format varyasyonuna kırılganlık, paraphrase gürültüsü."*

> *"Token-aware (boundary-aware) window. Core'un etrafındaki N token (kelime) alınsın. Hibrit: context_strategy: 'chars' | 'tokens' daha doğru tasarım."*

`idea.md` rafine edildi: **"Token-aware context window (chars-based kırılganlığın çözümü)"** alt-bölümü eklendi. Önce bu yeni bölümü oku.

---

## Bu iterasyonda yapılacaklar

### 1. Spec'e `strategy` alanı ekle

`src/artifacts/graphical-abstract.mjs` içindeki `spec.numeric_fields` ve `spec.soft_trace_fields` her entry'sinin `context_window` objesine yeni alanlar:

```javascript
context_window: {
  strategy: 'tokens',         // YENİ — varsayılan; eski davranış için 'chars'
  tokens_before: 2,
  tokens_after: 2,
  chars_before: 6,            // legacy fallback (strategy='chars' iken kullanılır)
  chars_after: 6,
},
```

`schema_version` → `0.6` (bump).

### 2. Tokenizer helper

Yeni fonksiyon:

```javascript
function tokenize(s) {
  // Whitespace + noktalama bazlı bölünme
  // Boş token'ları çıkar
  return String(s ?? '')
    .split(/[\s,;:.!?()[\]{}<>"]+/)
    .filter((t) => t.length > 0);
}

function findTokenIndexContaining(tokens, target) {
  // Hangi token core'u içeriyor (substring olarak)
  for (let i = 0; i < tokens.length; i++) {
    if (tokens[i].includes(target)) return i;
  }
  return -1;
}
```

### 3. `extractNumericCoresWithContext` genişletmesi

Token strategy desteği ekle:

```javascript
function extractNumericCoresWithContext(s, contextWindow, options = {}) {
  // ... mevcut regex extraction ...

  for each match:
    let window;
    if (contextWindow?.strategy === 'tokens') {
      const tokens = tokenize(s);
      const tokenIdx = findTokenIndexContaining(tokens, match[0]);
      if (tokenIdx === -1) {
        // Fallback: chars-based
        window = sliceChars(s, match.index, contextWindow);
      } else {
        const before = Math.max(0, tokenIdx - (contextWindow.tokens_before ?? 2));
        const after = Math.min(tokens.length, tokenIdx + 1 + (contextWindow.tokens_after ?? 2));
        window = tokens.slice(before, after).join(' ');
      }
    } else {
      // chars-based (legacy)
      window = sliceChars(s, match.index, contextWindow);
    }

    result.push({ core, index, window });
}
```

### 4. Mevcut payload'da kullan

Hard fields (`numeric_fields`) için:
```javascript
{
  path: 'panels[].primary_number',
  context_window: { strategy: 'tokens', tokens_before: 2, tokens_after: 2 },
}
{
  path: 'footer.key_stats[]',
  context_window: { strategy: 'tokens', tokens_before: 2, tokens_after: 2 },
}
```

Soft fields (`soft_trace_fields`) için aynı strategy.

### 5. Test (normal)

```bash
node bin/studio-agent.mjs compile --source knowledge-base.md --out output
```

Beklenti:
- Lint **PASS** (hard fields temiz olmaya devam etmeli)
- **Body warning sayısı:** muhtemelen aynı (paraphrase hala paraphrase) ama **mesaj kalitesi düzelmeli** — window artık kelime bütünlüğüyle gösterilsin

**Karşılaştırma — mesaj farkı:**

İterasyon-6 (chars-based):
```
50.3@"anca %50.3 düşüş"
```

İterasyon-7 beklenen (token-based):
```
50.3@"%50.3 düşüş;"  (veya "ortanca %50.3 düşüş" gibi temiz bir window)
```

Eğer warning'ler **netleşirse** iterasyon başarılı.

### 6. Negatif test (kritik)

Yine `süre = 12 ay` enjekte et (footer.key_stats'a):

İterasyon-5'te yakalanan: `12@"üre = 12 ay"` (chars-based, kırık)

İterasyon-7 beklenen: `12@"süre = 12 ay"` veya `12@"süre = 12 ay,"` (token-based, temiz)

**Asıl test:** mesaj insan-okunur mu? Önceki window'da "üre" gibi yarı kelime yoksa iyileştirme net.

Geri al.

### 7. Karşılaştırmalı test (bu iterasyonun değeri için)

Aynı body değeriyle hem chars hem tokens stratejisini ayrı ayrı çalıştırıp **lint mesajlarını karşılaştır.** Bunu kısa raporda göster.

Örnek format:
| Strategy | Window output |
|---|---|
| chars (eski) | `"anca %50.3 düşüş"` |
| tokens (yeni) | `"ortanca %50.3 düşüş"` veya `"%50.3 düşüş;"` |

### 8. Kısa rapor

İterasyon-7 sonunda yine kısa rapor:

- idea.md'nin yeni "Token-aware context window" bölümü yeterince netti mi?
- `tokens_before: 2, tokens_after: 2` doğru default mu, yoksa daha az/çok mu olmalı?
- Tokenizer'ın noktalama handling'i (virgül, parantez vb.) gerçek vakalarda iyi davrandı mı?
- Karşılaştırmalı test sonuçları — mesaj kalitesi gerçekten düzeldi mi?
- Bu iterasyonun bulduğu yeni edge case var mı? (örn. agent tek kelime yazsaydı window ne olurdu?)
- 8. iterasyon için en kritik 1-2 muğlaklık?

### 9. Önemli not

Bu iterasyonun **görünür kazancı küçük olabilir**: warning sayısı muhtemelen değişmez, sadece mesaj kalitesi düzelir. Bu doğal — token-aware mevcut "doğru reddedilen" vakaları "doğru ve okunur şekilde reddediyor". Asıl kazanım: ileride farklı KB veya format değişikliklerinde sistem daha sağlam olacak. Bu iterasyon **gelecek-koruyucu** bir iyileştirme; immediate kazanımdan çok mimari sağlamlık.

---

Başla. Önce idea.md'nin yeni bölümünü oku, sonra spec'e strategy ekle, tokenizer yaz, extractor'ı strategy-aware hale getir, hem normal hem negatif testi karşılaştırmalı çalıştır, raporla.
