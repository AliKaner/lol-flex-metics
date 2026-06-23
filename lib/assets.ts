// Şampiyon / profil ikonları için CDN yardımcıları.
// Community Dragon ID bazlı olduğu için isim eşleme tablosu gerektirmez.

const CDRAGON =
  "https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1";

export function championIcon(championId: number): string {
  return `${CDRAGON}/champion-icons/${championId}.png`;
}

export function profileIcon(iconId: number): string {
  return `${CDRAGON}/profile-icons/${iconId}.jpg`;
}
