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
  resolutionMethod?: "REGULAR" | "EXTRA_TIME" | "PENALTIES" | null,
): NonNullable<PredictionInput> {
  return { homeScore, awayScore, advancesTeamName, resolutionMethod };
}

function createResult(
  homeScore: number,
  awayScore: number,
  advancesTeamName?: string | null,
  resolutionMethod?: "REGULAR" | "EXTRA_TIME" | "PENALTIES" | null,
): NonNullable<ResultInput> {
  return { homeScore, awayScore, advancesTeamName, resolutionMethod };
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
      method: 0,
      bonus: 0,
      total: 3,
      reason: "Resultado exacto en fase de grupos.",
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
    expect(score.reason).toBe("Ganador o empate acertado en fase de grupos.");
  });

  it("returns 0 for the wrong outcome in group stage", () => {
    const score = calculatePredictionScore(
      createPrediction(1, 1),
      createResult(2, 0),
      createGroupMatch(),
    );

    expect(score.total).toBe(0);
    expect(score.reason).toBe("Ganador o empate no acertado en fase de grupos.");
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
      method: 0,
      bonus: 0,
      total: 0,
      reason: "Todavía no hay resultado cargado.",
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
      method: 0,
      bonus: 0,
      total: 0,
      reason: "No cargó pronóstico.",
    });
  });

  it("returns 6 for an exact knockout score with correct advancing team and method", () => {
    const score = calculatePredictionScore(
      createPrediction(2, 1, "Argentina", "REGULAR"),
      createResult(2, 1, "Argentina", "REGULAR"),
      createKnockoutMatch(),
    );

    expect(score).toEqual({
      exactScore: 3,
      outcome: 0,
      advances: 1,
      method: 1,
      bonus: 1,
      total: 6,
      reason:
        "Marcador exacto. Clasificado acertado. Método de resolución acertado. Bonus por exacto + clasificado.",
    });
  });

  it("returns 1 for a non-exact knockout score with correct outcome only", () => {
    const score = calculatePredictionScore(
      createPrediction(1, 0, "Brazil", "REGULAR"),
      createResult(3, 2, "Brazil", "REGULAR"),
      createKnockoutMatch(),
    );

    expect(score.total).toBe(3);
    expect(score.outcome).toBe(1);
    expect(score.exactScore).toBe(0);
    expect(score.advances).toBe(1);
    expect(score.method).toBe(1);
  });

  it("scores the final 120-minute result for EXTRA_TIME", () => {
    const score = calculatePredictionScore(
      createPrediction(2, 3, "Brazil", "EXTRA_TIME"),
      createResult(2, 3, "Brazil", "EXTRA_TIME"),
      createKnockoutMatch(),
    );

    expect(score.exactScore).toBe(3);
    expect(score.outcome).toBe(0);
    expect(score.advances).toBe(1);
    expect(score.method).toBe(1);
    expect(score.total).toBe(6);
  });

  it("returns points for draw at 90 resolved by penalties", () => {
    const score = calculatePredictionScore(
      createPrediction(1, 1, "Paraguay", "PENALTIES"),
      createResult(1, 1, "Paraguay", "PENALTIES"),
      createKnockoutMatch(),
    );

    expect(score.exactScore).toBe(3);
    expect(score.advances).toBe(1);
    expect(score.method).toBe(1);
    expect(score.bonus).toBe(1);
    expect(score.total).toBe(6);
  });

  it("keeps exact + classified bonus even with wrong method", () => {
    const score = calculatePredictionScore(
      createPrediction(2, 1, "Paraguay", "EXTRA_TIME"),
      createResult(2, 1, "Paraguay", "REGULAR"),
      createKnockoutMatch(),
    );

    expect(score.exactScore).toBe(3);
    expect(score.advances).toBe(1);
    expect(score.method).toBe(0);
    expect(score.bonus).toBe(1);
    expect(score.total).toBe(5);
  });

  it("does not award method point for legacy knockout predictions without method", () => {
    const score = calculatePredictionScore(
      createPrediction(1, 1, "Paraguay"),
      createResult(1, 1, "Paraguay", "PENALTIES"),
      createKnockoutMatch(),
    );

    expect(score.method).toBe(0);
    expect(score.total).toBe(5);
  });

  it("treats any non-group stage as knockout", () => {
    const score = calculatePredictionScore(
      createPrediction(2, 2, "Mexico", "PENALTIES"),
      createResult(2, 2, "Mexico", "PENALTIES"),
      { stage: "Semifinal" },
    );

    expect(score.total).toBe(6);
    expect(score.method).toBe(1);
  });
});
