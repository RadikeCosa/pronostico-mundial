import type { PrismaClient } from "@prisma/client";

type BackfillResult = {
    updatedToRegular: number;
    ambiguousDrawPredictions: number;
    inconsistentWinnerPredictions: Array<{
        predictionId: string;
        matchNumber: number;
        predictedAdvancesTeamName: string;
        expectedWinnerTeamName: string;
    }>;
};

function normalizeName(value: string | null | undefined): string | null {
    const trimmed = value?.trim();
    return trimmed && trimmed.length > 0 ? trimmed : null;
}

export async function backfillLegacyKnockoutPredictionResolutionMethods(
    prismaClient: PrismaClient,
): Promise<BackfillResult> {
    const legacyPredictions = await prismaClient.prediction.findMany({
        where: {
            resolutionMethod: null,
            match: {
                stage: {
                    not: "GROUP",
                },
            },
        },
        select: {
            id: true,
            homeScore: true,
            awayScore: true,
            advancesTeamName: true,
            match: {
                select: {
                    matchNumber: true,
                    homeTeamName: true,
                    awayTeamName: true,
                },
            },
        },
    });

    let updatedToRegular = 0;
    let ambiguousDrawPredictions = 0;
    const inconsistentWinnerPredictions: BackfillResult["inconsistentWinnerPredictions"] = [];

    for (const prediction of legacyPredictions) {
        const normalizedAdvancesTeamName = normalizeName(prediction.advancesTeamName);

        if (prediction.homeScore === prediction.awayScore) {
            ambiguousDrawPredictions += 1;
            continue;
        }

        const winnerTeamName =
            prediction.homeScore > prediction.awayScore
                ? prediction.match.homeTeamName
                : prediction.match.awayTeamName;

        if (
            normalizedAdvancesTeamName !== null &&
            normalizedAdvancesTeamName !== winnerTeamName
        ) {
            inconsistentWinnerPredictions.push({
                predictionId: prediction.id,
                matchNumber: prediction.match.matchNumber,
                predictedAdvancesTeamName: normalizedAdvancesTeamName,
                expectedWinnerTeamName: winnerTeamName,
            });
            continue;
        }

        await prismaClient.prediction.update({
            where: { id: prediction.id },
            data: {
                resolutionMethod: "REGULAR",
            },
        });
        updatedToRegular += 1;
    }

    return {
        updatedToRegular,
        ambiguousDrawPredictions,
        inconsistentWinnerPredictions,
    };
}
