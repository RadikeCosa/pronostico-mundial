import type { PrismaClient } from "@prisma/client";

type LegacyResolutionMethodAudit = {
  unresolvedNonDrawPredictions: number;
  unresolvedDrawPredictions: number;
};

export async function auditLegacyKnockoutPredictionResolutionMethods(
  prismaClient: PrismaClient,
): Promise<LegacyResolutionMethodAudit> {
  const legacyPredictions = await prismaClient.prediction.findMany({
    where: {
      resolutionMethod: null,
      match: {
        stage: {
          not: "GROUP",
        },
      },
    },
    select: {
      homeScore: true,
      awayScore: true,
    },
  });

  return legacyPredictions.reduce<LegacyResolutionMethodAudit>(
    (audit, prediction) => {
      if (prediction.homeScore === prediction.awayScore) {
        audit.unresolvedDrawPredictions += 1;
      } else {
        // A non-draw can now represent either REGULAR or EXTRA_TIME, so the
        // method cannot be inferred without additional historical knowledge.
        audit.unresolvedNonDrawPredictions += 1;
      }

      return audit;
    },
    {
      unresolvedNonDrawPredictions: 0,
      unresolvedDrawPredictions: 0,
    },
  );
}
