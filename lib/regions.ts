// Platform -> bölge kümesi eşlemesi.
// account-v1 ve match-v5 bölge kümesi (europe/americas/asia) ister;
// summoner-v4 platform (euw1/na1...) ister.

export const PLATFORMS: { value: string; label: string; region: string }[] = [
  { value: "euw1", label: "EUW (Batı Avrupa)", region: "europe" },
  { value: "eun1", label: "EUNE (Kuzey/Doğu Avrupa)", region: "europe" },
  { value: "tr1", label: "TR (Türkiye)", region: "europe" },
  { value: "ru", label: "RU (Rusya)", region: "europe" },
  { value: "na1", label: "NA (Kuzey Amerika)", region: "americas" },
  { value: "br1", label: "BR (Brezilya)", region: "americas" },
  { value: "la1", label: "LAN (Latin Amerika K.)", region: "americas" },
  { value: "la2", label: "LAS (Latin Amerika G.)", region: "americas" },
  { value: "oc1", label: "OCE (Okyanusya)", region: "americas" },
  { value: "kr", label: "KR (Kore)", region: "asia" },
  { value: "jp1", label: "JP (Japonya)", region: "asia" },
];

export function regionForPlatform(platform: string): string {
  return PLATFORMS.find((p) => p.value === platform)?.region ?? "europe";
}

// Flex 5v5 ranked sıra ID'si.
export const QUEUE_FLEX_5V5 = 440;
