import { describe, expect, it } from "vitest";
import { formatParticipantName, formatResultTrace } from "./presentation";

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
