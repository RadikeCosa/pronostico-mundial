import { describe, expect, it, vi } from "vitest";
import { auditLegacyKnockoutPredictionResolutionMethods } from "./prediction-resolution-backfill";

describe("legacy knockout prediction resolution method audit", () => {
  it("does not infer REGULAR because non-draw scores may be EXTRA_TIME", async () => {
    const update = vi.fn();

    const result = await auditLegacyKnockoutPredictionResolutionMethods({
      prediction: {
        findMany: async () => [
          { homeScore: 2, awayScore: 1 },
          { homeScore: 2, awayScore: 3 },
          { homeScore: 1, awayScore: 1 },
        ],
        update,
      },
    } as never);

    expect(update).not.toHaveBeenCalled();
    expect(result).toEqual({
      unresolvedNonDrawPredictions: 2,
      unresolvedDrawPredictions: 1,
    });
  });
});
