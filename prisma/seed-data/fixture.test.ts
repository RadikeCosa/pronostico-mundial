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
            [74, ["Germany", "Paraguay"]],
            [75, ["Netherlands", "Morocco"]],
            [76, ["Brazil", "Japan"]],
            [77, ["France", "Sweden"]],
            [78, ["Ivory Coast", "Norway"]],
            [79, ["Mexico", "Ecuador"]],
            [80, ["England", "DR Congo"]],
            [81, ["United States", "Bosnia and Herzegovina"]],
            [82, ["Belgium", "Senegal"]],
            [83, ["Portugal", "Croatia"]],
            [84, ["Spain", "Austria"]],
            [85, ["Switzerland", "Algeria"]],
            [86, ["Argentina", "Cape Verde"]],
            [87, ["Colombia", "Ghana"]],
            [88, ["Australia", "Egypt"]],
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

    it("keeps every derived knockout slot as a placeholder in fixture data", () => {
        const fixture = loadFixture();
        const derivedMatches = fixture.matches.filter((match) => match.matchNumber >= 89);

        expect(derivedMatches).toHaveLength(16);
        for (const match of derivedMatches) {
            expect([match.homeTeam, match.awayTeam]).toEqual(["TBD", "TBD"]);
        }

        expect(derivedMatches.find((match) => match.matchNumber === 89)).toMatchObject({
            kickoffAt: "2026-07-04T17:00:00-04:00",
            city: "Philadelphia",
        });
        expect(derivedMatches.find((match) => match.matchNumber === 90)).toMatchObject({
            kickoffAt: "2026-07-04T13:00:00-04:00",
            city: "Houston",
        });
    });
});
