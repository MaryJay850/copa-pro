/**
 * WhatsApp Message Templates
 *
 * Uses WhatsApp text formatting:
 * *bold*  _italic_  ~strikethrough~  ```monospace```
 */

// ── 1. Liga criada — boas-vindas do grupo ──

export function leagueCreatedMessage(leagueName: string): string {
  return (
    `🏆 *Bem-vindos ao grupo da liga ${leagueName}!*\n\n` +
    `Este grupo será usado para comunicações oficiais da liga:\n` +
    `📋 Anúncios de torneios\n` +
    `👥 Equipas formadas\n` +
    `📅 Calendários de jogos\n` +
    `🏅 Resultados e rankings\n\n` +
    `_Mensagens automáticas via CopaPro_`
  );
}

// ── 2. Torneio criado — anúncio + link inscrição ──

export function tournamentCreatedMessage(
  tournamentName: string,
  date: string,
  tournamentUrl: string
): string {
  return (
    `📢 *Novo Torneio: ${tournamentName}*\n\n` +
    `📅 Data: *${date}*\n\n` +
    `✅ Confirma a tua participação na plataforma:\n` +
    `${tournamentUrl}\n\n` +
    `_Inscreve-te já!_ 🎾`
  );
}

// ── 3. Equipas formadas ──

export function teamsAnnouncementMessage(
  tournamentName: string,
  teams: { name: string; player1: string; player2?: string | null }[]
): string {
  const teamsList = teams
    .map((t, i) => {
      const players = t.player2
        ? `${t.player1} & ${t.player2}`
        : t.player1;
      return `${i + 1}. *${t.name}* — ${players}`;
    })
    .join("\n");

  return (
    `👥 *Equipas — ${tournamentName}*\n\n` +
    `${teamsList}\n\n` +
    `_Boa sorte a todos!_ 💪`
  );
}

// ── 4. Calendário gerado — jogos por ronda ──

export function scheduleAnnouncementMessage(
  tournamentName: string,
  rounds: {
    roundIndex: number;
    matches: { teamA: string; teamB: string; court: string }[];
  }[]
): string {
  const roundsText = rounds
    .map((r) => {
      const matchLines = r.matches
        .map((m) => `  ⚔️ ${m.teamA} vs ${m.teamB} — _${m.court}_`)
        .join("\n");
      return `*Ronda ${r.roundIndex + 1}*\n${matchLines}`;
    })
    .join("\n\n");

  return (
    `📅 *Calendário — ${tournamentName}*\n\n` +
    `${roundsText}\n\n` +
    `_Bons jogos!_ 🎾`
  );
}

// ── 5. Torneio terminado — classificação final ──

export function tournamentFinishedMessage(
  tournamentName: string,
  rankings: { position: number; teamName: string; points: number; wins: number; losses: number }[]
): string {
  const medals = ["🥇", "🥈", "🥉"];
  const rankingList = rankings
    .map((r) => {
      const medal = medals[r.position - 1] || `${r.position}.`;
      return `${medal} *${r.teamName}* — ${r.points} pts (${r.wins}V ${r.losses}D)`;
    })
    .join("\n");

  return (
    `🏆 *Resultado Final — ${tournamentName}*\n\n` +
    `${rankingList}\n\n` +
    `_Parabéns a todos os participantes!_ 👏`
  );
}

// ── 6. Ranking da época ──

export function seasonRankingMessage(
  seasonName: string,
  rankings: { position: number; playerName: string; points: number; matchesPlayed: number }[]
): string {
  const rankingList = rankings
    .map((r) => {
      const medals = ["🥇", "🥈", "🥉"];
      const prefix = medals[r.position - 1] || `${r.position}.`;
      return `${prefix} *${r.playerName}* — ${r.points} pts (${r.matchesPlayed} jogos)`;
    })
    .join("\n");

  return (
    `📊 *Ranking da Época — ${seasonName}*\n\n` +
    `${rankingList}\n\n` +
    `_Ranking atualizado via CopaPro_`
  );
}
