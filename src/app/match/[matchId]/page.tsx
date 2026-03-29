import Dashboard from "@/components/Dashboard";
import NationalDashboard from "@/components/NationalDashboard";
import { scanMatchFiles } from "@/lib/data/scan-matches";

export default async function MatchPage({ params }: { params: Promise<{ matchId: string }> }) {
  const { matchId } = await params;
  
  const matches = scanMatchFiles();
  const match = matches.find(m => m.id === matchId);
  
  if (match?.matchType === "national") {
    return (
      <NationalDashboard 
        matchId={matchId} 
        defaultHome={match.homeTeam.name} 
        defaultAway={match.awayTeam.name} 
        defaultScore={match.score} 
      />
    );
  }

  return <Dashboard matchId={matchId} />;
}
