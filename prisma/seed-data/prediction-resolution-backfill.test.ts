import { describe, expect, it } from "vitest";
import { backfillLegacyKnockoutPredictionResolutionMethods } from "./prediction-resolution-backfill";

describe("legacy knockout prediction resolution method backfill", () => {
    it("infers REGULAR only when non-draw score does not contradict advancing team", async () => {
        const updates: Array<{ where: { id: string }; data: { resolutionMethod: string } }> = [];

        const result = await backfillLegacyKnockoutPredictionResolutionMethods({
            prediction: {
                findMany: async () => [
                    {
                        id: "p-1",
                        homeScore: 2,
                        awayScore: 1,
                        advancesTeamName: "",
                        match: {
                            matchNumber: 73,
                            homeTeamName: "South Africa",
                            awayTeamName: "Canada",
                        },
                    },
                    {
                        id: "p-2",
                        homeScore: 2,
                        awayScore: 1,
                        advancesTeamName: "South Africa",
                        match: {
                            matchNumber: 74,
                            homeTeamName: "Brazil",
                            awayTeamName: "Japan",
                        },
                    },
                    {
                        id: "p-3",
                        homeScore: 1,
                        awayScore: 1,
                        advancesTeamName: "Paraguay",
                        match: {
                            matchNumber: 75,
                            homeTeamName: "Germany",
                            awayTeamName: "Paraguay",
                        },
                    },
                ],
                update: async (args: { where: { id: string }; data: { resolutionMethod: string } }) => {
                    updates.push(args);
                    return {};
                },
            },
        } as never);

        expect(updates).toEqual([
            {
                where: { id: "p-1" },
                data: { resolutionMethod: "REGULAR" },
            },
        ]);

        expect(result).toEqual({
            updatedToRegular: 1,
            ambiguousDrawPredictions: 1,
            inconsistentWinnerPredictions: [
                {
                    predictionId: "p-2",
                    matchNumber: 74,
                    predictedAdvancesTeamName: "South Africa",
                    expectedWinnerTeamName: "Brazil",
                },
            ],
        });
    });
});
