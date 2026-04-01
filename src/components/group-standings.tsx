"use client";

import { Card, CardHeader, CardTitle } from "@/components/ui/card";

type TeamStanding = {
  teamId: string;
  teamName: string;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  setsWon: number;
  setsLost: number;
  setsDiff: number;
  gamesWon: number;
  gamesLost: number;
  gamesDiff: number;
  points: number;
};

type GroupStandings = {
  groupId: string;
  groupName: string;
  standings: TeamStanding[];
};

export function GroupStandings({
  groups,
  teamsAdvancing,
}: {
  groups: GroupStandings[];
  teamsAdvancing: number;
}) {
  return (
    <div className="space-y-4">
      {groups.map((group) => (
        <Card key={group.groupId}>
          <CardHeader>
            <CardTitle className="text-base">{group.groupName}</CardTitle>
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-surface-alt/50">
                  <th className="px-3 py-2 text-left text-xs font-bold text-text-muted w-8">#</th>
                  <th className="px-3 py-2 text-left text-xs font-bold text-text-muted">Equipa</th>
                  <th className="px-2 py-2 text-center text-xs font-bold text-text-muted w-8">J</th>
                  <th className="px-2 py-2 text-center text-xs font-bold text-text-muted w-8">V</th>
                  <th className="px-2 py-2 text-center text-xs font-bold text-text-muted w-14">%V</th>
                  <th className="px-2 py-2 text-center text-xs font-bold text-text-muted w-8">E</th>
                  <th className="px-2 py-2 text-center text-xs font-bold text-text-muted w-8">D</th>
                  <th className="px-2 py-2 text-center text-xs font-bold text-text-muted w-12">SG</th>
                  <th className="px-2 py-2 text-center text-xs font-bold text-text-muted w-12">SP</th>
                  <th className="px-2 py-2 text-center text-xs font-bold text-text-muted w-12">DS</th>
                  <th className="px-2 py-2 text-center text-xs font-bold text-text-muted w-12">Pts</th>
                </tr>
              </thead>
              <tbody>
                {group.standings.map((team, idx) => {
                  const qualifies = idx < teamsAdvancing;
                  return (
                    <tr
                      key={team.teamId}
                      className={`border-b border-border/50 ${
                        qualifies
                          ? "bg-green-50/50"
                          : ""
                      }`}
                    >
                      <td className="px-3 py-2 text-xs font-bold text-text-muted">{idx + 1}</td>
                      <td className="px-3 py-2 font-medium">
                        {team.teamName}
                        {qualifies && (
                          <span className="ml-2 text-[10px] text-green-600 font-semibold uppercase">Qualificado</span>
                        )}
                      </td>
                      <td className="px-2 py-2 text-center tabular-nums">{team.played}</td>
                      <td className="px-2 py-2 text-center tabular-nums text-green-600 font-semibold">{team.wins}</td>
                      <td className="px-2 py-2 text-center tabular-nums">
                        <span className={`text-xs font-semibold ${
                          team.played === 0 ? "text-text-muted" :
                          Math.round((team.wins / team.played) * 100) >= 60 ? "text-emerald-600" :
                          Math.round((team.wins / team.played) * 100) >= 40 ? "text-amber-600" :
                          "text-red-500"
                        }`}>
                          {team.played > 0 ? `${Math.round((team.wins / team.played) * 100)}%` : "—"}
                        </span>
                      </td>
                      <td className="px-2 py-2 text-center tabular-nums text-amber-600">{team.draws}</td>
                      <td className="px-2 py-2 text-center tabular-nums text-red-600">{team.losses}</td>
                      <td className="px-2 py-2 text-center tabular-nums">{team.setsWon}</td>
                      <td className="px-2 py-2 text-center tabular-nums">{team.setsLost}</td>
                      <td className="px-2 py-2 text-center tabular-nums font-medium">
                        {team.setsDiff > 0 ? `+${team.setsDiff}` : team.setsDiff}
                      </td>
                      <td className="px-2 py-2 text-center font-extrabold text-primary tabular-nums">{team.points}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      ))}
    </div>
  );
}
