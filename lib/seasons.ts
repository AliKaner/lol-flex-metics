export interface Season {
  id: string;
  labelTr: string;
  labelEn: string;
  startTime: number;
  endTime?: number;
}

export const SEASONS: Season[] = [
  {
    id: "s2026",
    labelTr: "Sezon 2026 (Aktif)",
    labelEn: "Season 2026 (Active)",
    startTime: Math.floor(new Date("2026-01-08T00:00:00Z").getTime() / 1000),
    endTime: undefined,
  },
  {
    id: "s2025",
    labelTr: "Sezon 2025",
    labelEn: "Season 2025",
    startTime: Math.floor(new Date("2025-01-08T00:00:00Z").getTime() / 1000),
    endTime: Math.floor(new Date("2026-01-08T00:00:00Z").getTime() / 1000),
  },
  {
    id: "s2024",
    labelTr: "Sezon 2024",
    labelEn: "Season 2024",
    startTime: Math.floor(new Date("2024-01-10T00:00:00Z").getTime() / 1000),
    endTime: Math.floor(new Date("2025-01-08T00:00:00Z").getTime() / 1000),
  },
  {
    id: "s2023",
    labelTr: "Sezon 2023",
    labelEn: "Season 2023",
    startTime: Math.floor(new Date("2023-01-11T00:00:00Z").getTime() / 1000),
    endTime: Math.floor(new Date("2024-01-10T00:00:00Z").getTime() / 1000),
  },
];

export const CURRENT_SEASON = SEASONS[0];
