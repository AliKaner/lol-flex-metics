// Sitedeki mizahi / "küfürlümsü" Türkçe metinler tek yerde.
// Amaç: oyuncu jargonu, hafif dalga geçen ama gerçek küfür içermeyen ton.

// Winrate'e göre takılan lakap.
export function wrRoast(wr: number, games: number, t?: (path: string) => string): string {
  if (games < 2) return t ? t("championReport.wrRoasts.newGamer") : "daha yeni başlamış, dokunmayın";
  if (wr >= 0.7) return t ? t("championReport.wrRoasts.god") : "tanrı modu, smurf bunlar";
  if (wr >= 0.55) return t ? t("championReport.wrRoasts.good") : "fena değil reis";
  if (wr >= 0.45) return t ? t("championReport.wrRoasts.average") : "ne iyi ne kötü, ekmeğini yiyor";
  if (wr >= 0.3) return t ? t("championReport.wrRoasts.bad") : "yük, takımı sırtında taşıtıyor";
  return t ? t("championReport.wrRoasts.feeder") : "besleme kral, en çok domalan";
}

// KDA'ya göre takılan lakap.
export function kdaRoast(kda: number, t?: (path: string) => string): string {
  if (kda >= 5) return t ? t("championReport.kdaRoasts.god") : "elinde silah var resmen";
  if (kda >= 3) return t ? t("championReport.kdaRoasts.good") : "idare eder";
  if (kda >= 1.5) return t ? t("championReport.kdaRoasts.average") : "ortalama bir fani";
  if (kda >= 1) return t ? t("championReport.kdaRoasts.bad") : "ölmeyi seviyor";
  return t ? t("championReport.kdaRoasts.feeder") : "haritaya feed dağıtıyor";
}

// Not: Eski COPY ve GUESS_RIGHT/GUESS_WRONG değişkenleri geriye uyumluluk için duruyor,
// ancak yeni kodlar translations.ts içindekileri kullanacaktır.
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
