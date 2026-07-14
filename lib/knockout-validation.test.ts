import { describe, expect, it } from "vitest";
import { validateMatchOutcomeValues } from "./knockout-validation";

function createInput(overrides: Record<string, unknown> = {}) {
  return {
    stage: "ROUND_OF_32",
    homeTeamName: "Germany",
    awayTeamName: "Paraguay",
    homeScoreRaw: "2",
    awayScoreRaw: "1",
    advancesTeamNameRaw: "Germany",
    resolutionMethodRaw: "REGULAR",
    ...overrides,
  };
}

describe("validateMatchOutcomeValues", () => {
  it("accepts REGULAR with a non-draw 90-minute score and its winner", () => {
    expect(validateMatchOutcomeValues(createInput())).toEqual({
      status: "success",
      values: {
        homeScore: 2,
        awayScore: 1,
        advancesTeamName: "Germany",
        resolutionMethod: "REGULAR",
      },
    });
  });

  it("accepts EXTRA_TIME with a non-draw 120-minute score and its winner", () => {
    expect(validateMatchOutcomeValues(createInput({
      homeScoreRaw: "2",
      awayScoreRaw: "3",
      advancesTeamNameRaw: "Paraguay",
      resolutionMethodRaw: "EXTRA_TIME",
    }))).toEqual({
      status: "success",
      values: {
        homeScore: 2,
        awayScore: 3,
        advancesTeamName: "Paraguay",
        resolutionMethod: "EXTRA_TIME",
      },
    });
  });

  it("accepts PENALTIES only with a draw and either advancing team", () => {
    expect(validateMatchOutcomeValues(createInput({
      homeScoreRaw: "1",
      awayScoreRaw: "1",
      advancesTeamNameRaw: "Paraguay",
      resolutionMethodRaw: "PENALTIES",
    }))).toEqual({
      status: "success",
      values: {
        homeScore: 1,
        awayScore: 1,
        advancesTeamName: "Paraguay",
        resolutionMethod: "PENALTIES",
      },
    });
  });

  it("rejects an advancing team that did not play the match", () => {
    expect(validateMatchOutcomeValues(createInput({
      advancesTeamNameRaw: "Brazil",
    }))).toEqual({
      status: "error",
      message: "El equipo clasificado debe coincidir con uno de los dos equipos del partido.",
    });
  });

  it("rejects a winner inconsistent with REGULAR or EXTRA_TIME score", () => {
    for (const resolutionMethodRaw of ["REGULAR", "EXTRA_TIME"]) {
      expect(validateMatchOutcomeValues(createInput({
        advancesTeamNameRaw: "Paraguay",
        resolutionMethodRaw,
      }))).toEqual({
        status: "error",
        message: `Con ${resolutionMethodRaw}, el clasificado debe coincidir con el ganador del marcador.`,
      });
    }
  });

  it("rejects draw scores for REGULAR and EXTRA_TIME", () => {
    expect(validateMatchOutcomeValues(createInput({
      homeScoreRaw: "1",
      awayScoreRaw: "1",
    }))).toEqual({
      status: "error",
      message: "Con REGULAR, el marcador final a los 90 minutos no puede estar empatado.",
    });

    expect(validateMatchOutcomeValues(createInput({
      homeScoreRaw: "2",
      awayScoreRaw: "2",
      resolutionMethodRaw: "EXTRA_TIME",
    }))).toEqual({
      status: "error",
      message: "Con EXTRA_TIME, el marcador final a los 120 minutos no puede estar empatado.",
    });
  });

  it("rejects a non-draw score for PENALTIES", () => {
    expect(validateMatchOutcomeValues(createInput({
      resolutionMethodRaw: "PENALTIES",
    }))).toEqual({
      status: "error",
      message: "Con PENALTIES, el marcador previo a los penales debe estar empatado.",
    });
  });

  it("rejects invalid scores", () => {
    for (const homeScoreRaw of ["-1", "1.5", "", Number.NaN]) {
      expect(validateMatchOutcomeValues(createInput({ homeScoreRaw }))).toEqual({
        status: "error",
        message: "Los goles deben ser enteros no negativos.",
      });
    }
  });

  it("requires advancing team and a valid method in every knockout match", () => {
    expect(validateMatchOutcomeValues(createInput({ advancesTeamNameRaw: "" }))).toEqual({
      status: "error",
      message: "En eliminación directa debés indicar qué equipo clasifica.",
    });
    expect(validateMatchOutcomeValues(createInput({ resolutionMethodRaw: "" }))).toEqual({
      status: "error",
      message: "En eliminación directa debés indicar un método de resolución válido.",
    });
  });

  it("accepts group scores and strips knockout-only values", () => {
    expect(validateMatchOutcomeValues(createInput({
      stage: "GROUP",
      homeScoreRaw: "1",
      awayScoreRaw: "1",
      advancesTeamNameRaw: "Brazil",
      resolutionMethodRaw: "PENALTIES",
    }))).toEqual({
      status: "success",
      values: {
        homeScore: 1,
        awayScore: 1,
        advancesTeamName: null,
        resolutionMethod: null,
      },
    });
  });
});
