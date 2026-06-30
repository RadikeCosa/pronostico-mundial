import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

type FixtureMatch = {
    matchNumber: number;
    stage: string;
    homeTeam: string;
    awayTeam: string;
    kickoffAt: string;
};

type FixtureData = {
    teams: Array<{ name: string }>;
    matches: FixtureMatch[];
};

function loadFixture(): FixtureData {
    const fixturePath = new URL("./fixture.json", import.meta.url);
    return JSON.parse(readFileSync(fixturePath, "utf8")) as FixtureData;
}

describe("knockout fixture data", () => {
    it("keeps the tournament totals stable", () => {
        const fixture = loadFixture();

        expect(fixture.teams).toHaveLength(48);
        expect(fixture.matches).toHaveLength(104);
    });

    it("has all Round of 32 matches 73-88 resolved with real teams", () => {
        const fixture = loadFixture();
        const expectedRoundOf32 = new Map<number, [string, string]>([
            [73, ["South Africa", "Canada"]],
            [74, ["Brazil", "Japan"]],
            [75, ["Germany", "Paraguay"]],
            [76, ["Netherlands", "Morocco"]],
            [77, ["Ivory Coast", "Norway"]],
            [78, ["France", "Sweden"]],
            [79, ["Mexico", "Ecuador"]],
            [80, ["England", "DR Congo"]],
            [81, ["Belgium", "Senegal"]],
            [82, ["United States", "Bosnia and Herzegovina"]],
            [83, ["Spain", "Austria"]],
            [84, ["Portugal", "Croatia"]],
            [85, ["Switzerland", "Algeria"]],
            [86, ["Australia", "Egypt"]],
            [87, ["Argentina", "Cape Verde"]],
            [88, ["Colombia", "Ghana"]],
        ]);

        const roundOf32 = fixture.matches.filter(
            (match) => match.stage === "Round of 32" && match.matchNumber >= 73 && match.matchNumber <= 88,
        );

        expect(roundOf32).toHaveLength(16);

        for (const match of roundOf32) {
            const expectedTeams = expectedRoundOf32.get(match.matchNumber);

            expect(expectedTeams).toBeDefined();
            expect([match.homeTeam, match.awayTeam]).toEqual(expectedTeams);
            expect(match.homeTeam).not.toMatch(/Group|Best 3rd|TBD|W-32-/);
            expect(match.awayTeam).not.toMatch(/Group|Best 3rd|TBD|W-32-/);
        }
    });

    it("updates Round of 16 with winners and keeps unresolved rivals as labels", () => {
        const fixture = loadFixture();
        const matchByNumber = new Map(
            fixture.matches.map((match) => [match.matchNumber, match]),
        );

        expect(matchByNumber.get(89)).toMatchObject({
            stage: "Round of 16",
            homeTeam: "Canada",
            awayTeam: "Morocco",
            kickoffAt: "2026-07-04T13:00:00-04:00",
        });
        expect(matchByNumber.get(90)).toMatchObject({
            stage: "Round of 16",
            homeTeam: "Paraguay",
            awayTeam: "W-32-5",
            kickoffAt: "2026-07-04T17:00:00-04:00",
        });
        expect(matchByNumber.get(91)).toMatchObject({
            stage: "Round of 16",
            homeTeam: "Brazil",
            awayTeam: "W-32-6",
            kickoffAt: "2026-07-05T16:00:00-04:00",
        });

        expect(matchByNumber.get(92)).toMatchObject({
            homeTeam: "W-32-7",
            awayTeam: "W-32-8",
        });
        expect(matchByNumber.get(93)).toMatchObject({
            homeTeam: "W-32-11",
            awayTeam: "W-32-12",
        });
        expect(matchByNumber.get(94)).toMatchObject({
            homeTeam: "W-32-9",
            awayTeam: "W-32-10",
        });
        expect(matchByNumber.get(95)).toMatchObject({
            homeTeam: "W-32-14",
            awayTeam: "W-32-16",
        });
        expect(matchByNumber.get(96)).toMatchObject({
            homeTeam: "W-32-13",
            awayTeam: "W-32-15",
        });
    });
});