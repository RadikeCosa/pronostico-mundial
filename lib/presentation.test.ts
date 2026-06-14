import { describe, expect, it } from "vitest";
import { formatResultTrace } from "./presentation";

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
