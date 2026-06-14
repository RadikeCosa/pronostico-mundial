import { describe, expect, it } from "vitest";
import {
  calculatePredictionScore,
  type MatchInput,
  type PredictionInput,
  type ResultInput,
} from "./scoring";

function createGroupMatch(): MatchInput {
  return { stage: "Group" };
}

function createKnockoutMatch(stage = "Quarterfinal"): MatchInput {
  return { stage };
}

function createPrediction(
  homeScore: number,
  awayScore: number,
  advancesTeamName?: string | null,
): NonNullable<PredictionInput> {
  return { homeScore, awayScore, advancesTeamName };
}

function createResult(
  homeScore: number,
  awayScore: number,
  advancesTeamName?: string | null,
): NonNullable<ResultInput> {
  return { homeScore, awayScore, advancesTeamName };
}

describe("calculatePredictionScore", () => {
  it("returns 3 for an exact score in group stage", () => {
    const score = calculatePredictionScore(
      createPrediction(2, 1),
      createResult(2, 1),
      createGroupMatch(),
    );

    expect(score).toEqual({
      exactScore: 3,
      outcome: 0,
      advances: 0,
      total: 3,
      reason: "Exact score in group stage.",
    });
  });

  it("returns 1 for a correct winner in group stage without exact score", () => {
    const score = calculatePredictionScore(
      createPrediction(1, 0),
      createResult(3, 1),
      createGroupMatch(),
    );

    expect(score.total).toBe(1);
    expect(score.outcome).toBe(1);
    expect(score.exactScore).toBe(0);
  });

  it("returns 1 for a correct draw in group stage without exact score", () => {
    const score = calculatePredictionScore(
      createPrediction(0, 0),
      createResult(2, 2),
      createGroupMatch(),
    );

    expect(score.total).toBe(1);
    expect(score.outcome).toBe(1);
    expect(score.reason).toBe("Correct match outcome in group stage.");
  });

  it("returns 0 for the wrong outcome in group stage", () => {
    const score = calculatePredictionScore(
      createPrediction(1, 1),
      createResult(2, 0),
      createGroupMatch(),
    );

    expect(score.total).toBe(0);
    expect(score.reason).toBe("Incorrect match outcome in group stage.");
  });

  it("returns 0 with a clear reason when there is no result", () => {
    const score = calculatePredictionScore(
      createPrediction(1, 1),
      null,
      createGroupMatch(),
    );

    expect(score).toEqual({
      exactScore: 0,
      outcome: 0,
      advances: 0,
      total: 0,
      reason: "Match result is not available yet.",
    });
  });

  it("returns 0 with a clear reason when there is no prediction", () => {
    const score = calculatePredictionScore(
      null,
      createResult(1, 1),
      createGroupMatch(),
    );

    expect(score).toEqual({
      exactScore: 0,
      outcome: 0,
      advances: 0,
      total: 0,
      reason: "No prediction submitted.",
    });
  });

  it("returns 4 for an exact knockout draw with the correct advancing team", () => {
    const score = calculatePredictionScore(
      createPrediction(1, 1, "Argentina"),
      createResult(1, 1, "Argentina"),
      createKnockoutMatch(),
    );

    expect(score).toEqual({
      exactScore: 3,
      outcome: 0,
      advances: 1,
      total: 4,
      reason: "Exact draw and correct advancing team in knockout match.",
    });
  });

  it("returns 3 for an exact knockout draw with the wrong advancing team", () => {
    const score = calculatePredictionScore(
      createPrediction(1, 1, "Brazil"),
      createResult(1, 1, "Argentina"),
      createKnockoutMatch(),
    );

    expect(score.total).toBe(3);
    expect(score.advances).toBe(0);
    expect(score.reason).toBe(
      "Exact draw in knockout match, but advancing team was not correct.",
    );
  });

  it("returns 1 in knockout when the draw is not exact but the advancing team is correct", () => {
    const score = calculatePredictionScore(
      createPrediction(0, 0, "Argentina"),
      createResult(1, 1, "Argentina"),
      createKnockoutMatch(),
    );

    expect(score).toEqual({
      exactScore: 0,
      outcome: 0,
      advances: 1,
      total: 1,
      reason:
        "Knockout draw predicted without the exact score, but with the correct advancing team.",
    });
  });

  it("treats any non-group stage as knockout", () => {
    const score = calculatePredictionScore(
      createPrediction(2, 2, "Mexico"),
      createResult(2, 2, "Mexico"),
      { stage: "Semifinal" },
    );

    expect(score.total).toBe(4);
    expect(score.advances).toBe(1);
  });
});
