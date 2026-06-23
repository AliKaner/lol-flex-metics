# Bağlantılar / Sinerji Analizi (Feature Spec)

Amaç: Eklenen oyuncular arasındaki **ikili etkileşimlerin** takım başarısına
etkisini ölçmek ve "şu ikisi birlikteyse winrate %X değişir" şeklinde anlaşılır
ifadeler üretmek.

## Veri kaynağı

Tüm hesaplama **flex 5v5 (queue 440)** maçlarından gelir. Her maç için ilgili
oyuncuların aynı takımda (`teamId` eşit) olup olmadığına ve maçı kazanıp
kazanmadığına bakılır.

## Metrikler

### 1. İkili sinerji (pair lift)

Her oyuncu çifti (A, B) için:

- `birlikteWR` = A ve B aynı takımdayken oynanan maçlardaki winrate
- `bazWR` = bu iki oyuncunun (ayrı ayrı) genel takım winrate ortalaması
  (yani "birlikte olmadıkları" ya da genel referans winrate)
- `lift = birlikteWR - bazWR`

Çıktı cümlesi:
- `lift > 0`  → "**A + B** birlikte olunca winrate **+%{lift}** artıyor"
- `lift < 0`  → "**A + B** birlikte olunca winrate **%{lift}** düşüyor"

Güven için minimum birlikte maç eşiği (örn. ≥ 3 maç) uygulanır; altındakiler
"yetersiz örneklem" olarak işaretlenir.

### 2. 5'li kadro içi etki (opsiyonel genişletme)

5'li bir kadro seçildiğinde, kadrodan bir çifti çıkarıp/eklediğinde beklenen
winrate değişimi:

- "Bu 5'liden **A + B** ikilisi çıkarsa winrate ~%X artar" gibi.

Bu, çiftin lift değerinin kadro ortalamasına göre işaretlenmesiyle yaklaşık
hesaplanır (örneklem küçük olduğu için yön/işaret odaklı, kesin sayı değil).

## UI

- "Bağlantılar" sekmesi.
- En güçlü pozitif sinerjiler (yeşil) ve en zararlı eşleşmeler (kırmızı) ayrı
  listelenir, lift'e göre sıralı.
- Her satır: oyuncu çifti, birlikte maç sayısı, birlikte WR, lift (±%).
- Minimum maç eşiği için bir filtre.

## Notlar / sınırlamalar

- Dev API key sınırlı sayıda maç çektiği için örneklem küçük olabilir; bu yüzden
  sonuçlar "kesin" değil "eğilim" olarak sunulur ve maç sayısı her zaman gösterilir.
- İleride: rol bazlı sinerji, karşı takımda olma etkisi (counter), şampiyon
  ikilisi sinerjisi eklenebilir.
