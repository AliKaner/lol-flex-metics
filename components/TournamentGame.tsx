"use client";

import { useMemo, useState, useEffect } from "react";
import type { Match, TrackedUser } from "@/types/riot";
import { useTranslation } from "@/lib/i18n";
import { findParticipant, userParticipations } from "@/lib/analysis";

interface SquadSlot {
  puuid: string;
  championName: string;
  basePower: number; // calculated from winrate (30 to 80)
}

interface ActiveBuff {
  role: string; // "top" | "jungle" | "mid" | "adc" | "support"
  nameTr: string;
  nameEn: string;
  boost: number;
}

interface TeamState {
  id: string;
  nameTr: string;
  nameEn: string;
  power: number;
  isUser: boolean;
}

interface MatchNode {
  teamA?: TeamState;
  teamB?: TeamState;
  winner?: TeamState;
  score?: string;
}

const ROLES = ["top", "jungle", "mid", "adc", "support"] as const;
type Role = (typeof ROLES)[number];

const OPPONENTS: Record<string, { tr: string; en: string; power: number }> = {
  opp_gatekeepers: { tr: "Silver 4 Gatekeepers", en: "Silver 4 Gatekeepers", power: 48 },
  opp_bronz: { tr: "Bronz Ejderhaları", en: "Bronze Dragons", power: 45 },
  opp_sirk: { tr: "Sirk Esnafları", en: "Circus Merchants", power: 52 },
  opp_tilt: { tr: "Tilt Fedaileri", en: "Tilt Crusaders", power: 50 },
  opp_faker: { tr: "Faker'ın Yeğenleri", en: "Faker's Nephews", power: 58 },
  opp_kanser: { tr: "Kanser Queue", en: "Cancer Queue", power: 55 },
  opp_script: { tr: "Script Kullanıcıları", en: "Script Users", power: 62 },
};

const BUFF_POOL = [
  { tr: "[Name]'e 2 yeni el alındı", en: "Bought 2 new hands for [Name]", boost: 15 },
  { tr: "[Name]'in beyni yenilendi", en: "[Name]'s brain refreshed", boost: 20 },
  { tr: "[Name] bir temiz dövüldü akıllandı", en: "[Name] was beaten clean and came to his senses", boost: 25 },
  { tr: "[Name]'e gözlük alındı (görüşü düzeldi)", en: "Bought glasses for [Name] (vision improved)", boost: 15 },
  { tr: "[Name]'in internet paketi yenilendi (pingi düştü)", en: "[Name]'s internet package renewed (ping dropped)", boost: 15 },
  { tr: "[Name]'e ekran kartı alındı (FPS +100)", en: "Bought new GPU for [Name] (FPS +100)", boost: 20 },
  { tr: "[Name]'e duble Türk kahvesi yapıldı (refleks +50)", en: "Brewed double Turkish coffee for [Name] (reflex +50)", boost: 15 },
];

export function TournamentGame({
  users,
  matches,
}: {
  users: TrackedUser[];
  matches: Match[];
}) {
  const { t, lang } = useTranslation();

  // Squad selection states
  const [squad, setSquad] = useState<Record<Role, SquadSlot>>({
    top: { puuid: "", championName: "", basePower: 50 },
    jungle: { puuid: "", championName: "", basePower: 50 },
    mid: { puuid: "", championName: "", basePower: 50 },
    adc: { puuid: "", championName: "", basePower: 50 },
    support: { puuid: "", championName: "", basePower: 50 },
  });

  // Game UI States
  const [gameState, setGameState] = useState<"setup" | "bracket" | "simulating" | "result" | "champion">("setup");
  const [currentRound, setCurrentRound] = useState<"qf" | "sf" | "f">("qf");

  // Buffs state
  const [activeBuffs, setActiveBuffs] = useState<ActiveBuff[]>([]);
  const [availableBuffs, setAvailableBuffs] = useState<ActiveBuff[]>([]);

  // Simulation state
  const [simLogs, setSimLogs] = useState<string[]>([]);
  const [simProgress, setSimProgress] = useState(0);
  const [simResult, setSimResult] = useState<"win" | "loss" | null>(null);

  // Bracket state
  const [bracket, setBracket] = useState<{
    qf: MatchNode[];
    sf: MatchNode[];
    f: MatchNode[];
  }>({ qf: [], sf: [], f: [] });

  // Get list of champions played by a user
  const getUserChampions = (puuid: string) => {
    if (!puuid) return [];
    const parts = userParticipations(matches, puuid);
    const uniqueChamps = new Map<string, { count: number; wins: number }>();
    for (const { p } of parts) {
      const stats = uniqueChamps.get(p.championName) || { count: 0, wins: 0 };
      stats.count++;
      if (p.win) stats.wins++;
      uniqueChamps.set(p.championName, stats);
    }
    return [...uniqueChamps.entries()].map(([name, stats]) => ({
      name,
      winRate: Math.round((stats.wins / stats.count) * 100),
      count: stats.count,
    }));
  };

  // Check if setup is valid (5 unique players selected)
  const isSetupValid = useMemo(() => {
    const selectedPuuids = Object.values(squad)
      .map((s) => s.puuid)
      .filter(Boolean);
    return selectedPuuids.length === 5 && new Set(selectedPuuids).size === 5;
  }, [squad]);

  // Calculate base winrate power for a player/champion
  const handlePlayerChange = (role: Role, puuid: string) => {
    const userChamps = getUserChampions(puuid);
    const defaultChamp = userChamps[0]?.name || "";
    const basePower = userChamps[0]
      ? Math.max(30, Math.min(80, userChamps[0].winRate))
      : 50;

    setSquad((prev) => ({
      ...prev,
      [role]: { puuid, championName: defaultChamp, basePower },
    }));
  };

  const handleChampionChange = (role: Role, championName: string) => {
    const slot = squad[role];
    const userChamps = getUserChampions(slot.puuid);
    const champStat = userChamps.find((c) => c.name === championName);
    const basePower = champStat ? Math.max(30, Math.min(80, champStat.winRate)) : 50;

    setSquad((prev) => ({
      ...prev,
      [role]: { ...prev[role], championName, basePower },
    }));
  };

  // Get translated player name
  const getPlayerName = (puuid: string) => {
    return users.find((u) => u.puuid === puuid)?.gameName || "Unknown";
  };

  // Get active power for a player (base + active buffs)
  const getPlayerPower = (role: Role) => {
    const slot = squad[role];
    const roleBuffsBoost = activeBuffs
      .filter((b) => b.role === role)
      .reduce((sum, b) => sum + b.boost, 0);
    return Math.min(100, slot.basePower + roleBuffsBoost);
  };

  // Calculate combined team power (average of all roles)
  const teamPower = useMemo(() => {
    const total = ROLES.reduce((sum, role) => sum + getPlayerPower(role), 0);
    return Math.round(total / 5);
  }, [squad, activeBuffs]);

  // Initialize Bracket Teams
  const startTournament = () => {
    if (!isSetupValid) return;

    const userTeam: TeamState = {
      id: "user",
      nameTr: "Bizim Ekip",
      nameEn: "Our Crew",
      power: teamPower,
      isUser: true,
    };

    const makeTeam = (key: string): TeamState => {
      const info = OPPONENTS[key];
      return {
        id: key,
        nameTr: info.tr,
        nameEn: info.en,
        power: info.power,
        isUser: false,
      };
    };

    const tGatekeepers = makeTeam("opp_gatekeepers");
    const tBronz = makeTeam("opp_bronz");
    const tSirk = makeTeam("opp_sirk");
    const tTilt = makeTeam("opp_tilt");
    const tFaker = makeTeam("opp_faker");
    const tKanser = makeTeam("opp_kanser");
    const tScript = makeTeam("opp_script");

    // Quarterfinals matches
    const qfMatches: MatchNode[] = [
      { teamA: userTeam, teamB: tGatekeepers },
      { teamA: tBronz, teamB: tSirk },
      { teamA: tTilt, teamB: tFaker },
      { teamA: tKanser, teamB: tScript },
    ];

    // Simulate QF simulated matches immediately to see prospective bracket winners
    const sfMatch2Winner = Math.random() * 100 < (tSirk.power / (tSirk.power + tBronz.power)) * 100 ? tSirk : tBronz;
    const sfMatch3Winner = Math.random() * 100 < (tFaker.power / (tFaker.power + tTilt.power)) * 100 ? tFaker : tTilt;
    const sfMatch4Winner = Math.random() * 100 < (tScript.power / (tScript.power + tKanser.power)) * 100 ? tScript : tKanser;

    const sfMatches: MatchNode[] = [
      { teamA: undefined, teamB: sfMatch2Winner },
      { teamA: sfMatch3Winner, teamB: sfMatch4Winner },
    ];

    const fMatches: MatchNode[] = [
      { teamA: undefined, teamB: undefined },
    ];

    setBracket({
      qf: qfMatches,
      sf: sfMatches,
      f: fMatches,
    });

    setGameState("bracket");
    setCurrentRound("qf");
    setActiveBuffs([]);
  };

  // Simulation process
  const simulateMatch = () => {
    setGameState("simulating");
    setSimProgress(0);
    setSimLogs([]);

    const opponent =
      currentRound === "qf"
        ? bracket.qf[0].teamB!
        : currentRound === "sf"
        ? bracket.sf[0].teamB!
        : bracket.f[0].teamB!;

    // Power calculation
    const userPower = teamPower; // updates based on buffs
    const oppPower = opponent.power;
    const winProbability = (userPower / (userPower + oppPower)) * 100;
    const isWin = Math.random() * 100 < winProbability;

    // Simulation log templates
    const rawLogs = t("tournament.logs") as unknown as string[];

    let currentStep = 0;
    const interval = setInterval(() => {
      if (currentStep < rawLogs.length) {
        // Replace placeholders with real names/champs
        let log = rawLogs[currentStep];
        log = log.replace("[Top]", `${getPlayerName(squad.top.puuid)} (${squad.top.championName})`);
        log = log.replace("[Jungle]", `${getPlayerName(squad.jungle.puuid)} (${squad.jungle.championName})`);
        log = log.replace("[Mid]", `${getPlayerName(squad.mid.puuid)} (${squad.mid.championName})`);
        log = log.replace("[Adc]", `${getPlayerName(squad.adc.puuid)} (${squad.adc.championName})`);
        log = log.replace("[Support]", `${getPlayerName(squad.support.puuid)} (${squad.support.championName})`);

        setSimLogs((prev) => [...prev, log]);
        setSimProgress(((currentStep + 1) / rawLogs.length) * 100);
        currentStep++;
      } else {
        clearInterval(interval);
        setSimResult(isWin ? "win" : "loss");
        setGameState("result");

        if (isWin) {
          // Generate 3 random buffs
          const randomBuffs: ActiveBuff[] = [];
          const shuffledRoles = [...ROLES].sort(() => 0.5 - Math.random());
          const shuffledBuffs = [...BUFF_POOL].sort(() => 0.5 - Math.random());

          for (let i = 0; i < 3; i++) {
            const role = shuffledRoles[i];
            const buffTemplate = shuffledBuffs[i];
            const pName = getPlayerName(squad[role].puuid);

            randomBuffs.push({
              role,
              nameTr: buffTemplate.tr.replace("[Name]", pName),
              nameEn: buffTemplate.en.replace("[Name]", pName),
              boost: buffTemplate.boost,
            });
          }
          setAvailableBuffs(randomBuffs);
        }
      }
    }, 1200);
  };

  // Apply a chosen buff
  const chooseBuff = (buff: ActiveBuff) => {
    setActiveBuffs((prev) => [...prev, buff]);

    // Update bracket nodes
    const userTeam: TeamState = {
      id: "user",
      nameTr: "Bizim Ekip",
      nameEn: "Our Crew",
      power: teamPower + buff.boost, // preview updated power
      isUser: true,
    };

    if (currentRound === "qf") {
      const nextSf = [...bracket.sf];
      nextSf[0].teamA = userTeam;
      setBracket((prev) => ({
        ...prev,
        qf: prev.qf.map((m, i) => (i === 0 ? { ...m, winner: userTeam, score: "1 - 0" } : m)),
        sf: nextSf,
      }));
      setCurrentRound("sf");
      setGameState("bracket");
    } else if (currentRound === "sf") {
      // Simulate opponent result for the other Semifinal
      const match2 = bracket.sf[1];
      const match2Winner =
        Math.random() * 100 < (match2.teamB!.power / (match2.teamA!.power + match2.teamB!.power)) * 100
          ? match2.teamB!
          : match2.teamA!;

      const nextF = [...bracket.f];
      nextF[0].teamA = userTeam;
      nextF[0].teamB = match2Winner;

      setBracket((prev) => ({
        ...prev,
        sf: prev.sf.map((m, i) =>
          i === 0
            ? { ...m, winner: userTeam, score: "1 - 0" }
            : { ...m, winner: match2Winner, score: "1 - 0" }
        ),
        f: nextF,
      }));
      setCurrentRound("f");
      setGameState("bracket");
    } else {
      // Finals victory
      setBracket((prev) => ({
        ...prev,
        f: prev.f.map((m) => ({ ...m, winner: userTeam, score: "1 - 0" })),
      }));
      setGameState("champion");
    }
  };

  // Reset/Retry tournament
  const resetTournament = () => {
    setGameState("setup");
    setActiveBuffs([]);
    setAvailableBuffs([]);
    setSimLogs([]);
    setSimResult(null);
  };

  if (users.length < 5) {
    return (
      <div className="panel empty" style={{ textAlign: "center", padding: "40px 20px" }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>⚠️</div>
        <h3>{t("tournament.title")}</h3>
        <p className="muted" style={{ maxWidth: 500, margin: "10px auto 20px auto" }}>
          {t("tournament.notEnoughUsers", { count: users.length })}
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* 1. SETUP SQUAD SCREEN */}
      {gameState === "setup" && (
        <div>
          <h2>{t("tournament.title")}</h2>
          <p className="subtitle" style={{ marginTop: -8 }}>
            {t("tournament.subtitle")}
          </p>

          <div className="card" style={{ marginBottom: 24 }}>
            <h3 style={{ marginTop: 0 }}>{t("tournament.setupSquad")}</h3>
            <p className="muted" style={{ fontSize: 13, marginTop: -6, marginBottom: 20 }}>
              {t("tournament.squadSub")}
            </p>

            <div className="grid" style={{ gap: 16 }}>
              {ROLES.map((role) => {
                const slot = squad[role];
                const availableChamps = getUserChampions(slot.puuid);

                return (
                  <div
                    key={role}
                    className="row flex-wrap"
                    style={{
                      padding: 12,
                      background: "var(--panel-2)",
                      borderRadius: 8,
                      border: "1px solid var(--border)",
                      justifyContent: "space-between",
                      gap: 16,
                    }}
                  >
                    <div style={{ minWidth: 150 }}>
                      <strong style={{ textTransform: "capitalize", color: "var(--accent)" }}>
                        {t(`tournament.role${role.charAt(0).toUpperCase() + role.slice(1)}`)}
                      </strong>
                    </div>

                    <div className="row" style={{ gap: 12, flex: 1, justifyContent: "flex-end" }}>
                      {/* Player Select */}
                      <select
                        value={slot.puuid}
                        onChange={(e) => handlePlayerChange(role, e.target.value)}
                        style={{ minWidth: 160 }}
                      >
                        <option value="">{t("tournament.selectPlayer")}</option>
                        {users.map((u) => (
                          <option key={u.puuid} value={u.puuid}>
                            {u.gameName}
                          </option>
                        ))}
                      </select>

                      {/* Champion Select */}
                      {slot.puuid && (
                        <select
                          value={slot.championName}
                          onChange={(e) => handleChampionChange(role, e.target.value)}
                          style={{ minWidth: 160 }}
                        >
                          <option value="">{t("tournament.selectChamp")}</option>
                          {availableChamps.map((c) => (
                            <option key={c.name} value={c.name}>
                              {c.name} ({c.winRate}% WR)
                            </option>
                          ))}
                          {availableChamps.length === 0 && (
                            <option value="Yasuo">Yasuo (50% WR)</option>
                          )}
                        </select>
                      )}

                      {/* Power Badge */}
                      {slot.puuid && slot.championName && (
                        <span className="badge win" style={{ fontSize: 11, minWidth: 80, textAlign: "center" }}>
                          {slot.basePower}% Power
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Start Button */}
            <div style={{ marginTop: 24, textAlign: "right" }}>
              {!isSetupValid && (
                <p className="loss" style={{ fontSize: 12, marginBottom: 12 }}>
                  {t("tournament.uniquePlayersError")}
                </p>
              )}
              <button
                className="btn"
                disabled={!isSetupValid}
                onClick={startTournament}
                style={{
                  padding: "10px 24px",
                  fontSize: 14,
                  background: isSetupValid ? "var(--accent-2)" : "var(--panel-2)",
                  color: isSetupValid ? "#021014" : "var(--text-muted)",
                }}
              >
                {t("tournament.startTournament")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. BRACKET VIEW SCREEN */}
      {gameState === "bracket" && (
        <div>
          <h2>{t("tournament.title")}</h2>
          <p className="subtitle" style={{ marginTop: -8 }}>
            {t("tournament.bracketTitle")}
          </p>

          <div
            className="row"
            style={{
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 20,
              padding: 12,
              background: "var(--panel-2)",
              borderRadius: 8,
              border: "1px solid var(--border)",
            }}
          >
            <div>
              <span className="muted">Combined Squad Power:</span>{" "}
              <strong className="win" style={{ fontSize: 18 }}>
                {teamPower}%
              </strong>
            </div>
            <button
              onClick={simulateMatch}
              style={{
                padding: "8px 20px",
                background: "var(--accent-2)",
                color: "#021014",
                borderRadius: "6px",
                fontWeight: 700,
              }}
            >
              {t("tournament.playMatch")}
            </button>
          </div>

          {/* Visual Bracket Grid Layout */}
          <div
            className="panel"
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: 24,
              overflowX: "auto",
              padding: 20,
              background: "var(--panel-1)",
            }}
          >
            {/* Columns headers */}
            <div style={{ textAlign: "center", fontWeight: 700, color: "var(--accent)" }}>
              {t("tournament.roundOf8")}
            </div>
            <div style={{ textAlign: "center", fontWeight: 700, color: "var(--accent)" }}>
              {t("tournament.roundOf4")}
            </div>
            <div style={{ textAlign: "center", fontWeight: 700, color: "var(--accent)" }}>
              {t("tournament.finals")}
            </div>

            {/* Column 1: Quarterfinals */}
            <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", gap: 32 }}>
              {bracket.qf.map((match, i) => {
                const isCurrent = currentRound === "qf" && i === 0;
                return (
                  <div
                    key={i}
                    style={{
                      padding: 10,
                      background: "var(--panel-2)",
                      borderRadius: 8,
                      border: isCurrent ? "2px solid var(--accent)" : "1px solid var(--border)",
                      boxShadow: isCurrent ? "0 0 10px rgba(56, 189, 248, 0.4)" : "none",
                    }}
                  >
                    <div style={{ fontWeight: match.winner?.id === match.teamA?.id ? 700 : 400 }}>
                      <span className={match.teamA?.isUser ? "win" : ""}>
                        {lang === "tr" ? match.teamA?.nameTr : match.teamA?.nameEn}
                      </span>{" "}
                      {match.teamA?.isUser && `(${match.teamA.power}%)`}
                    </div>
                    <div
                      style={{
                        margin: "4px 0",
                        fontSize: 10,
                        color: "var(--text-muted)",
                        borderBottom: "1px solid var(--border)",
                        paddingBottom: 4,
                      }}
                    >
                      VS
                    </div>
                    <div style={{ fontWeight: match.winner?.id === match.teamB?.id ? 700 : 400 }}>
                      <span>{lang === "tr" ? match.teamB?.nameTr : match.teamB?.nameEn}</span>{" "}
                      <span className="muted">({match.teamB?.power}%)</span>
                    </div>
                    {match.score && (
                      <div className="win" style={{ fontSize: 11, marginTop: 6, fontWeight: 700 }}>
                        Result: {match.score} (Winner: {lang === "tr" ? match.winner?.nameTr : match.winner?.nameEn})
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Column 2: Semifinals */}
            <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", gap: 90, paddingTop: 30 }}>
              {bracket.sf.map((match, i) => {
                const isCurrent = currentRound === "sf" && i === 0;
                const teamAName = match.teamA
                  ? lang === "tr"
                    ? match.teamA.nameTr
                    : match.teamA.nameEn
                  : "TBD";
                const teamBName = match.teamB
                  ? lang === "tr"
                    ? match.teamB.nameTr
                    : match.teamB.nameEn
                  : "TBD";

                return (
                  <div
                    key={i}
                    style={{
                      padding: 10,
                      background: "var(--panel-2)",
                      borderRadius: 8,
                      border: isCurrent ? "2px solid var(--accent)" : "1px solid var(--border)",
                      boxShadow: isCurrent ? "0 0 10px rgba(56, 189, 248, 0.4)" : "none",
                    }}
                  >
                    <div style={{ fontWeight: match.winner?.id === match.teamA?.id ? 700 : 400 }}>
                      <span className={match.teamA?.isUser ? "win" : ""}>{teamAName}</span>{" "}
                      {match.teamA?.isUser && `(${match.teamA.power}%)`}
                    </div>
                    <div
                      style={{
                        margin: "4px 0",
                        fontSize: 10,
                        color: "var(--text-muted)",
                        borderBottom: "1px solid var(--border)",
                        paddingBottom: 4,
                      }}
                    >
                      VS
                    </div>
                    <div style={{ fontWeight: match.winner?.id === match.teamB?.id ? 700 : 400 }}>
                      <span>{teamBName}</span> {match.teamB && <span className="muted">({match.teamB.power}%)</span>}
                    </div>
                    {match.score && (
                      <div className="win" style={{ fontSize: 11, marginTop: 6, fontWeight: 700 }}>
                        Result: {match.score}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Column 3: Finals */}
            <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", gap: 32 }}>
              {bracket.f.map((match, i) => {
                const isCurrent = currentRound === "f";
                const teamAName = match.teamA
                  ? lang === "tr"
                    ? match.teamA.nameTr
                    : match.teamA.nameEn
                  : "TBD";
                const teamBName = match.teamB
                  ? lang === "tr"
                    ? match.teamB.nameTr
                    : match.teamB.nameEn
                  : "TBD";

                return (
                  <div
                    key={i}
                    style={{
                      padding: 10,
                      background: "var(--panel-2)",
                      borderRadius: 8,
                      border: isCurrent ? "2px solid var(--accent)" : "1px solid var(--border)",
                      boxShadow: isCurrent ? "0 0 10px rgba(56, 189, 248, 0.4)" : "none",
                    }}
                  >
                    <div style={{ fontWeight: match.winner?.id === match.teamA?.id ? 700 : 400 }}>
                      <span className={match.teamA?.isUser ? "win" : ""}>{teamAName}</span>{" "}
                      {match.teamA?.isUser && `(${match.teamA.power}%)`}
                    </div>
                    <div
                      style={{
                        margin: "4px 0",
                        fontSize: 10,
                        color: "var(--text-muted)",
                        borderBottom: "1px solid var(--border)",
                        paddingBottom: 4,
                      }}
                    >
                      VS
                    </div>
                    <div style={{ fontWeight: match.winner?.id === match.teamB?.id ? 700 : 400 }}>
                      <span>{teamBName}</span> {match.teamB && <span className="muted">({match.teamB.power}%)</span>}
                    </div>
                    {match.score && (
                      <div className="win" style={{ fontSize: 11, marginTop: 6, fontWeight: 700 }}>
                        Result: {match.score}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 3. SIMULATION LOG SCREEN */}
      {gameState === "simulating" && (
        <div className="card" style={{ padding: 24, textAlign: "center" }}>
          <h2>{t("tournament.simulating")}</h2>
          <div className="progress" style={{ margin: "20px 0", height: 12 }}>
            <div style={{ width: `${simProgress}%`, transition: "width 0.4s" }} />
          </div>

          <div
            style={{
              maxHeight: 250,
              overflowY: "auto",
              background: "#021014",
              border: "1px solid var(--border)",
              borderRadius: 6,
              padding: 16,
              textAlign: "left",
              fontFamily: "monospace",
              fontSize: 13,
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            {simLogs.map((log, idx) => (
              <div key={idx} className="fade-in">
                {log}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. RESULT (WIN/LOSS & BUFF SELECTION) SCREEN */}
      {gameState === "result" && (
        <div className="card" style={{ padding: 30, textAlign: "center" }}>
          {simResult === "win" ? (
            <div>
              <h1 className="win" style={{ fontSize: 36, textShadow: "0 0 15px rgba(52, 211, 153, 0.6)" }}>
                {t("tournament.victoryTitle")}
              </h1>

              <div style={{ margin: "24px 0" }}>
                <h3>{t("tournament.selectBuffTitle")}</h3>
                <div
                  className="grid"
                  style={{ gap: 16, gridTemplateColumns: "1fr", maxWidth: 500, margin: "0 auto" }}
                >
                  {availableBuffs.map((buff, idx) => (
                    <button
                      key={idx}
                      className="card game-select-card"
                      onClick={() => chooseBuff(buff)}
                      style={{
                        padding: 16,
                        textAlign: "left",
                        cursor: "pointer",
                        border: "1px solid var(--border)",
                        background: "var(--panel-2)",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <span style={{ fontWeight: 600, color: "var(--accent)" }}>
                        {lang === "tr" ? buff.nameTr : buff.nameEn}
                      </span>
                      <span className="badge win">+{buff.boost}% WR Power</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div>
              <h1 className="loss" style={{ fontSize: 36, textShadow: "0 0 15px rgba(251, 113, 133, 0.6)" }}>
                {t("tournament.defeatTitle")}
              </h1>
              <p
                style={{
                  fontSize: 16,
                  fontStyle: "italic",
                  maxWidth: 550,
                  margin: "20px auto 30px auto",
                  lineHeight: 1.5,
                }}
              >
                "{
                  (t("tournament.roasts") as unknown as string[])[
                    Math.floor(Math.random() * (t("tournament.roasts") as unknown as string[]).length)
                  ]
                }"
              </p>

              <button
                onClick={resetTournament}
                style={{
                  padding: "10px 24px",
                  fontSize: 14,
                  fontWeight: 700,
                  background: "var(--panel-2)",
                  border: "1px solid var(--border)",
                  color: "var(--text)",
                  borderRadius: 6,
                  cursor: "pointer",
                }}
              >
                {t("tournament.tryAgain")}
              </button>
            </div>
          )}
        </div>
      )}

      {/* 5. CHAMPION TROPHY SCREEN */}
      {gameState === "champion" && (
        <div className="card" style={{ padding: 40, textAlign: "center" }}>
          <div style={{ fontSize: 80, marginBottom: 12 }}>🏆</div>
          <h1 className="win" style={{ fontSize: 38, textShadow: "0 0 20px rgba(56, 189, 248, 0.6)" }}>
            {t("tournament.congratsTitle")}
          </h1>
          <p className="muted" style={{ maxWidth: 500, margin: "10px auto 30px auto" }}>
            {t("tournament.congratsSub")}
          </p>

          <div
            style={{
              maxWidth: 400,
              margin: "0 auto 30px auto",
              padding: 16,
              background: "var(--panel-2)",
              borderRadius: 8,
              border: "1px solid var(--border)",
              textAlign: "left",
            }}
          >
            <div className="row" style={{ justifyContent: "space-between", marginBottom: 8 }}>
              <span>{t("tournament.finalTeamPower")}</span>
              <strong className="win" style={{ fontSize: 18 }}>
                {teamPower}%
              </strong>
            </div>

            {activeBuffs.length > 0 && (
              <div style={{ borderTop: "1px solid var(--border)", paddingTop: 12, marginTop: 12 }}>
                <span className="muted" style={{ fontSize: 13 }}>
                  {t("tournament.buffsTitle")}
                </span>
                <ul style={{ margin: "8px 0 0 0", paddingLeft: 20, fontSize: 13 }}>
                  {activeBuffs.map((buff, i) => (
                    <li key={i} style={{ marginBottom: 4 }}>
                      {lang === "tr" ? buff.nameTr : buff.nameEn} (
                      <span className="win">+{buff.boost}%</span>)
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <button
            onClick={resetTournament}
            style={{
              padding: "10px 24px",
              fontSize: 14,
              fontWeight: 700,
              background: "var(--accent-2)",
              color: "#021014",
              borderRadius: 6,
              border: "none",
              cursor: "pointer",
            }}
          >
            {t("tournament.tryAgain")}
          </button>
        </div>
      )}
    </div>
  );
}
