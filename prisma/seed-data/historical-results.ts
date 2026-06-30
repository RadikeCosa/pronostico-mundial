type HistoricalMatchResult = {
    matchNumber: number;
    homeScore: number;
    awayScore: number;
    advancesTeamName: string | null;
};

type MatchLookup = Map<number, { id: string }>;

type MatchResultUpsertClient = {
    matchResult: {
        upsert: (args: {
            where: { matchId: string };
            update: {
                homeScore: number;
                awayScore: number;
                advancesTeamName: string | null;
                updatedByParticipantId: string | null;
            };
            create: {
                matchId: string;
                homeScore: number;
                awayScore: number;
                advancesTeamName: string | null;
                createdByParticipantId: string | null;
                updatedByParticipantId: string | null;
            };
        }) => Promise<unknown>;
    };
};

export const HISTORICAL_MATCH_RESULTS: HistoricalMatchResult[] = [
    {
        matchNumber: 73,
        homeScore: 0,
        awayScore: 1,
        advancesTeamName: "Canada",
    },
    {
        matchNumber: 74,
        homeScore: 2,
        awayScore: 1,
        advancesTeamName: "Brazil",
    },
    {
        matchNumber: 75,
        homeScore: 1,
        awayScore: 1,
        advancesTeamName: "Paraguay",
    },
    {
        matchNumber: 76,
        homeScore: 1,
        awayScore: 1,
        advancesTeamName: "Morocco",
    },
];

export async function upsertHistoricalMatchResults(args: {
    prismaClient: MatchResultUpsertClient;
    matchByNumber: MatchLookup;
    adminParticipantId: string | null;
    results?: HistoricalMatchResult[];
}): Promise<void> {
    const {
        prismaClient,
        matchByNumber,
        adminParticipantId,
        results = HISTORICAL_MATCH_RESULTS,
    } = args;

    for (const result of results) {
        const match = matchByNumber.get(result.matchNumber);

        if (!match) {
            throw new Error(
                `Missing match for seed result ${result.matchNumber}`,
            );
        }

        await prismaClient.matchResult.upsert({
            where: { matchId: match.id },
            update: {
                homeScore: result.homeScore,
                awayScore: result.awayScore,
                advancesTeamName: result.advancesTeamName,
                updatedByParticipantId: adminParticipantId,
            },
            create: {
                matchId: match.id,
                homeScore: result.homeScore,
                awayScore: result.awayScore,
                advancesTeamName: result.advancesTeamName,
                createdByParticipantId: adminParticipantId,
                updatedByParticipantId: adminParticipantId,
            },
        });
    }
}