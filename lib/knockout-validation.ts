export type ResolutionMethod = "REGULAR" | "EXTRA_TIME" | "PENALTIES";

export type MatchOutcomeValidationInput = {
  stage: string;
  homeTeamName: string;
  awayTeamName: string;
  homeScoreRaw: unknown;
  awayScoreRaw: unknown;
  advancesTeamNameRaw: unknown;
  resolutionMethodRaw: unknown;
};

type MatchOutcomeValidationSuccess = {
  status: "success";
  values: {
    homeScore: number;
    awayScore: number;
    advancesTeamName: string | null;
    resolutionMethod: ResolutionMethod | null;
  };
};

type MatchOutcomeValidationError = {
  status: "error";
  message: string;
};

export type MatchOutcomeValidationResult =
  | MatchOutcomeValidationSuccess
  | MatchOutcomeValidationError;

function isGroupStage(stage: string): boolean {
  return stage.trim().toUpperCase() === "GROUP";
}

function parseScore(rawValue: unknown): number | null {
  if (typeof rawValue === "number") {
    return Number.isSafeInteger(rawValue) && rawValue >= 0 ? rawValue : null;
  }

  if (typeof rawValue !== "string" || !/^\d+$/.test(rawValue.trim())) {
    return null;
  }

  const score = Number.parseInt(rawValue.trim(), 10);
  return Number.isSafeInteger(score) ? score : null;
}

function normalizeName(rawValue: unknown): string | null {
  if (typeof rawValue !== "string") {
    return null;
  }

  const trimmed = rawValue.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function normalizeResolutionMethod(
  rawValue: unknown,
): ResolutionMethod | null {
  if (typeof rawValue !== "string") {
    return null;
  }

  const normalized = rawValue.trim().toUpperCase();
  if (
    normalized === "REGULAR" ||
    normalized === "EXTRA_TIME" ||
    normalized === "PENALTIES"
  ) {
    return normalized;
  }

  return null;
}

export function validateMatchOutcomeValues(
  input: MatchOutcomeValidationInput,
): MatchOutcomeValidationResult {
  const homeScore = parseScore(input.homeScoreRaw);
  const awayScore = parseScore(input.awayScoreRaw);

  if (homeScore === null || awayScore === null) {
    return {
      status: "error",
      message: "Los goles deben ser enteros no negativos.",
    };
  }

  if (isGroupStage(input.stage)) {
    return {
      status: "success",
      values: {
        homeScore,
        awayScore,
        advancesTeamName: null,
        resolutionMethod: null,
      },
    };
  }

  const advancesTeamName = normalizeName(input.advancesTeamNameRaw);
  const resolutionMethod = normalizeResolutionMethod(input.resolutionMethodRaw);

  if (advancesTeamName === null) {
    return {
      status: "error",
      message: "En eliminación directa debés indicar qué equipo clasifica.",
    };
  }

  if (resolutionMethod === null) {
    return {
      status: "error",
      message: "En eliminación directa debés indicar un método de resolución válido.",
    };
  }

  if (
    advancesTeamName !== input.homeTeamName &&
    advancesTeamName !== input.awayTeamName
  ) {
    return {
      status: "error",
      message:
        "El equipo clasificado debe coincidir con uno de los dos equipos del partido.",
    };
  }

  const isDraw = homeScore === awayScore;

  if (resolutionMethod === "PENALTIES") {
    if (!isDraw) {
      return {
        status: "error",
        message: "Con PENALTIES, el marcador previo a los penales debe estar empatado.",
      };
    }
  } else {
    if (isDraw) {
      const duration = resolutionMethod === "REGULAR" ? "90" : "120";
      return {
        status: "error",
        message: `Con ${resolutionMethod}, el marcador final a los ${duration} minutos no puede estar empatado.`,
      };
    }

    const winnerTeamName = homeScore > awayScore
      ? input.homeTeamName
      : input.awayTeamName;

    if (advancesTeamName !== winnerTeamName) {
      return {
        status: "error",
        message: `Con ${resolutionMethod}, el clasificado debe coincidir con el ganador del marcador.`,
      };
    }
  }

  return {
    status: "success",
    values: {
      homeScore,
      awayScore,
      advancesTeamName,
      resolutionMethod,
    },
  };
}
