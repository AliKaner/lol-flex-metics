# League Map 🗺️

Takip ettiğin oyuncuların **flex 5v5 (queue 440)** maçlarını analiz eden,
Next.js + React Query ile yazılmış bir web uygulaması. Tüm metinler hafif
dalga geçen Türkçe ton ile yazıldı.

## Özellikler

- **Sınırsız oyuncu ekleme** — Riot ID (`İsim#TAG`) ile. Veriler tarayıcıda
  saklanır; aynı oyuncu için tekrar tekrar istek atılmaz (React Query + localStorage).
- **Tanrı mı, besleme mi** — her oyuncunun en iyi / en kötü şampiyonu (winrate, KDA).
- **Şampiyon sıralaması** — her şampiyonun altında o şampiyonu oynayan oyuncular
  başarıya göre sıralı.
- **Carry mi, sirk mi** — tüm 3'lü ve 5'li kombinasyonların aynı takımda birlikte
  oynadığı maçlar, winrate ile.
- **Kim kimi taşıyor** — ikili sinerji: "şu ikisi birlikteyse winrate %X değişir".
  (bkz. `docs/baglantilar.md`)
- **Efsane & utanç** — oyuncu başına en iyi / en kötü maçlar (performans puanı).
- **Takım kurucu** — seçili oyuncuları rastgele iki takıma böler, rol atar.
- **Who is that AGAmon** — rastgele bir maç skoru kimin? Bilemezsen şampiyon ipucu açılır.

## Kurulum

```bash
npm install
# .env.example'ı kopyalayıp Riot API key'ini gir:
cp .env.example .env.local   # ve RIOT_API_KEY=... satırını düzenle
npm run dev
```

`http://localhost:3000` (port doluysa 3001).

> ⚠️ **Development API key'leri her 24 saatte bir geçersiz olur.**
> Hata alırsan https://developer.riotgames.com/ adresinden yeni key alıp
> `.env.local` dosyasını güncelle.

## Mimari notlar

- Riot API tarayıcıdan doğrudan çağrılamaz (CORS yok) ve key gizli kalmalı.
  Bu yüzden istekler `app/api/riot/[...slug]/route.ts` proxy'sinden geçer; key
  yalnızca sunucuda, `X-Riot-Token` header'ında kullanılır.
- Tüm analiz mantığı `lib/analysis.ts` içinde saf fonksiyonlar olarak durur.
- Riot tarafından onaylanmamıştır.
