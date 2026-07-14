import { describe, expect, it } from "vitest";
import {
    HISTORICAL_MATCH_RESULTS,
    upsertHistoricalMatchResults,
} from "./historical-results";

describe("historical knockout result seed", () => {
    it("upserts results for matches 73-76 with correct advancesTeamName", async () => {
        const upsertCalls: Array<{
            where: { matchId: string };
            update: {
                homeScore: number;
                awayScore: number;
                advancesTeamName: string | null;
                resolutionMethod: "REGULAR" | "EXTRA_TIME" | "PENALTIES";
                updatedByParticipantId: string | null;
            };
            create: {
                matchId: string;
                homeScore: number;
                awayScore: number;
                advancesTeamName: string | null;
                resolutionMethod: "REGULAR" | "EXTRA_TIME" | "PENALTIES";
                createdByParticipantId: string | null;
                updatedByParticipantId: string | null;
            };
        }> = [];

        const matchByNumber = new Map(
            [73, 74, 75, 76].map((matchNumber) => [matchNumber, { id: `m-${matchNumber}` }]),
        );

        await upsertHistoricalMatchResults({
            prismaClient: {
                matchResult: {
                    upsert: async (args) => {
                        upsertCalls.push(args);
                        return {};
                    },
                },
            },
            matchByNumber,
            adminParticipantId: "ramiro-id",
        });

        expect(upsertCalls).toHaveLength(4);
        expect(
            upsertCalls.map((call) => ({
                matchId: call.where.matchId,
                homeScore: call.update.homeScore,
                awayScore: call.update.awayScore,
                advancesTeamName: call.update.advancesTeamName,
                resolutionMethod: call.update.resolutionMethod,
            })),
        ).toEqual([
            {
                matchId: "m-73",
                homeScore: 0,
                awayScore: 1,
                advancesTeamName: "Canada",
                resolutionMethod: "REGULAR",
            },
            {
                matchId: "m-74",
                homeScore: 1,
                awayScore: 1,
                advancesTeamName: "Paraguay",
                resolutionMethod: "PENALTIES",
            },
            {
                matchId: "m-75",
                homeScore: 1,
                awayScore: 1,
                advancesTeamName: "Morocco",
                resolutionMethod: "PENALTIES",
            },
            {
                matchId: "m-76",
                homeScore: 2,
                awayScore: 1,
                advancesTeamName: "Brazil",
                resolutionMethod: "REGULAR",
            },
        ]);

        const drawUpdates = upsertCalls.filter(
            (call) => call.update.homeScore === 1 && call.update.awayScore === 1,
        );
        expect(drawUpdates).toHaveLength(2);
        expect(drawUpdates.map((call) => call.update.advancesTeamName)).toEqual([
            "Paraguay",
            "Morocco",
        ]);

        expect(upsertCalls[0].create).toMatchObject({
            createdByParticipantId: "ramiro-id",
            updatedByParticipantId: "ramiro-id",
        });
        expect(upsertCalls[0].update).toMatchObject({
            updatedByParticipantId: "ramiro-id",
        });
    });

    it("fails fast if a seeded result points to a missing match", async () => {
        await expect(
            upsertHistoricalMatchResults({
                prismaClient: {
                    matchResult: {
                        upsert: async () => ({}),
                    },
                },
                matchByNumber: new Map([[73, { id: "m-73" }]]),
                adminParticipantId: null,
                results: HISTORICAL_MATCH_RESULTS,
            }),
        ).rejects.toThrowError("Missing match for seed result 74");
    });
});
