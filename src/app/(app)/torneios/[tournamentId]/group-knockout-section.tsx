import { getGroupStandings } from "@/lib/actions/group-knockout-actions";
import { GroupStandings } from "@/components/group-standings";
import { BracketView } from "@/components/bracket-view";
import { AdvanceToKnockoutButton } from "./advance-knockout-button";

export async function GroupKnockoutSection({
  tournamentId,
  tournament,
  canManage,
  finishedMatches,
}: {
  tournamentId: string;
  tournament: any;
  canManage: boolean;
  finishedMatches: number;
}) {
  const groupStandings = await getGroupStandings(tournamentId);

  // Get knockout matches
  const knockoutMatches = tournament.rounds
    .flatMap((r: any) => r.matches)
    .filter((m: any) => m.bracketPhase && m.bracketPhase !== "GROUP");

  // Check if all group matches are finished
  const groupMatches = tournament.rounds
    .flatMap((r: any) => r.matches)
    .filter((m: any) => m.bracketPhase === "GROUP" || !m.bracketPhase);
  const allGroupsFinished = groupMatches.length > 0 && groupMatches.every((m: any) => m.status === "FINISHED");
  const isGroupPhase = tournament.currentPhase === "GROUPS";

  return (
    <div className="space-y-6">
      {/* Group Standings */}
      {groupStandings.length > 0 && (
        <GroupStandings
          groups={groupStandings}
          teamsAdvancing={tournament.teamsAdvancing || 1}
        />
      )}

      {/* Advance to Knockout button */}
      {canManage && isGroupPhase && allGroupsFinished && knockoutMatches.length === 0 && (
        <AdvanceToKnockoutButton tournamentId={tournamentId} />
      )}

      {/* Bracket View */}
      {knockoutMatches.length > 0 && (
        <BracketView matches={knockoutMatches} />
      )}
    </div>
  );
}
