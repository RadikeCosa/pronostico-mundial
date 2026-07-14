import { describe, expect, it } from "vitest";
import {
  formatParticipantName,
  formatPredictionSummary,
  formatResultSummary,
  formatResultTrace,
} from "./presentation";

describe("formatParticipantName", () => {
  it("capitalizes participant names for display", () => {
    expect(formatParticipantName("ramiro")).toBe("Ramiro");
    expect(formatParticipantName("PEDRO")).toBe("Pedro");
    expect(formatParticipantName("  ana   maría  ")).toBe("Ana María");
  });
});

describe("formatResultTrace", () => {
  it("shows the creator when there is no separate editor", () => {
    expect(
      formatResultTrace({
        createdByParticipantName: "Ramiro",
        updatedByParticipantName: "Ramiro",
      }),
    ).toBe("Agregado por Ramiro");
  });

  it("shows creator and editor when they differ", () => {
    expect(
      formatResultTrace({
        createdByParticipantName: "Ramiro",
        updatedByParticipantName: "Pedro",
      }),
    ).toBe("Agregado por Ramiro · editado por Pedro");
  });

  it("does not break old results without traceability", () => {
    expect(
      formatResultTrace({
        createdByParticipantName: null,
        updatedByParticipantName: null,
      }),
    ).toBeNull();
  });
});

describe("knockout score summaries", () => {
  const context = {
    stage: "ROUND_OF_16",
    homeTeamName: "Germany",
    awayTeamName: "Paraguay",
  };

  it("labels EXTRA_TIME as a final score at 120 minutes", () => {
    expect(formatPredictionSummary({
      homeScore: 2,
      awayScore: 3,
      advancesTeamName: "Paraguay",
      resolutionMethod: "EXTRA_TIME",
    }, context)).toBe(
      "120': Germany 2 - 3 Paraguay · Clasifica Paraguay · En tiempo suplementario",
    );
  });

  it("labels PENALTIES as the tied score before penalties", () => {
    expect(formatResultSummary({
      homeScore: 1,
      awayScore: 1,
      advancesTeamName: "Germany",
      resolutionMethod: "PENALTIES",
    }, context)).toBe(
      "Antes de penales: Germany 1 - 1 Paraguay · Clasifica Germany · Por penales",
    );
  });
});
