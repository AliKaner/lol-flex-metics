// Sitedeki mizahi / "küfürlümsü" Türkçe metinler tek yerde.
// Amaç: oyuncu jargonu, hafif dalga geçen ama gerçek küfür içermeyen ton.

// Winrate'e göre takılan lakap.
export function wrRoast(wr: number, games: number): string {
  if (games < 2) return "daha yeni başlamış, dokunmayın";
  if (wr >= 0.7) return "tanrı modu, smurf bunlar";
  if (wr >= 0.55) return "fena değil reis";
  if (wr >= 0.45) return "ne iyi ne kötü, ekmeğini yiyor";
  if (wr >= 0.3) return "yük, takımı sırtında taşıtıyor";
  return "besleme kral, en çok domalan";
}

// KDA'ya göre takılan lakap.
export function kdaRoast(kda: number): string {
  if (kda >= 5) return "elinde silah var resmen";
  if (kda >= 3) return "idare eder";
  if (kda >= 1.5) return "ortalama bir fani";
  if (kda >= 1) return "ölmeyi seviyor";
  return "haritaya feed dağıtıyor";
}

// Sekme / başlık metinleri.
export const COPY = {
  bestChamp: "TANRI OLDUĞU",
  worstChamp: "EN ÇOK DOMALDIĞI",
  bestMatches: "🔥 Efsane kareler",
  worstMatches: "💀 En çok domaldığı maçlar",
  bestMatchesSub: "Maç başına en parladığı anlar. Burada kral, başka yerde soru işareti.",
  worstMatchesSub: "Utanç müzesi. Bu maçlardan sonra LoL'ü bıraktığını söylemiş olabilir.",
  positiveSynergy: "↑ Birbirini taşıyan ikililer",
  negativeSynergy: "↓ Birbirini batıran ikililer",
  guessTitle: "Who is that AGAmon? 🕵️",
  guessSub:
    "Bu rezil/efsane skor kimin? Bilemezsen şampiyon ipucu açılır, utancın katlanır.",
  comboSub:
    "Hangi 3'lü / 5'li birlikte queue'ya girince ne oluyor? Carry mi, sirk mi?",
};

// Doğru/yanlış tahmin tepkileri.
export const GUESS_WRONG = [
  "Yok artık, bu kadar mı tanımıyorsun?",
  "Tuttun tutturamadın. İpucu açıldı, daha kolay olamaz.",
  "Yanlış! Şampiyona bak bari.",
];
export const GUESS_RIGHT = [
  "Tamam tamam, biliyormuşsun.",
  "Doğru bildin, alkışı hak ettin.",
  "İşte bu! Sıradaki.",
];

export function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
