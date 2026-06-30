import type { ResolutionMethod } from "@prisma/client";

type KnockoutValidationInput = {
    stage: string;
    homeTeamName: string;
    awayTeamName: string;
    homeScore: number;
    awayScore: number;
    advancesTeamNameRaw: FormDataEntryValue | null;
    resolutionMethodRaw: FormDataEntryValue | null;
};

type KnockoutValidationSuccess = {
    status: "success";
    values: {
        advancesTeamName: string | null;
        resolutionMethod: ResolutionMethod | null;
    };
};

type KnockoutValidationError = {
    status: "error";
    message: string;
};

export type KnockoutValidationResult =
    | KnockoutValidationSuccess
    | KnockoutValidationError;

function isGroupStage(stage: string): boolean {
    return stage.trim().toUpperCase() === "GROUP";
}

function normalizeName(rawValue: FormDataEntryValue | null): string | null {
    if (typeof rawValue !== "string") {
        return null;
    }

    const trimmed = rawValue.trim();
    return trimmed.length > 0 ? trimmed : null;
}

function parseResolutionMethod(
    rawValue: FormDataEntryValue | null,
): ResolutionMethod | null | "invalid" {
    if (typeof rawValue !== "string") {
        return null;
    }

    const trimmed = rawValue.trim();
    if (trimmed.length === 0) {
        return null;
    }

    if (
        trimmed === "REGULAR" ||
        trimmed === "EXTRA_TIME" ||
        trimmed === "PENALTIES"
    ) {
        return trimmed;
    }

    return "invalid";
}

export function validateKnockoutWriteValues(
    input: KnockoutValidationInput,
): KnockoutValidationResult {
    if (isGroupStage(input.stage)) {
        return {
            status: "success",
            values: {
                advancesTeamName: null,
                resolutionMethod: null,
            },
        };
    }

    const advancesTeamName = normalizeName(input.advancesTeamNameRaw);
    const resolutionMethod = parseResolutionMethod(input.resolutionMethodRaw);

    if (advancesTeamName === null) {
        return {
            status: "error",
            message: "En eliminación directa debés indicar qué equipo clasifica.",
        };
    }

    if (resolutionMethod === "invalid") {
        return {
            status: "error",
            message: "Método de resolución inválido.",
        };
    }

    if (resolutionMethod === null) {
        return {
            status: "error",
            message: "En eliminación directa debés indicar el método de resolución.",
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

    const isDrawAt90 = input.homeScore === input.awayScore;

    if (!isDrawAt90 && resolutionMethod !== "REGULAR") {
        return {
            status: "error",
            message: "Con marcador no empatado a 90, el método debe ser REGULAR.",
        };
    }

    if (isDrawAt90 && resolutionMethod === "REGULAR") {
        return {
            status: "error",
            message:
                "Con marcador empatado a 90, el método debe ser EXTRA_TIME o PENALTIES.",
        };
    }

    if (!isDrawAt90 && resolutionMethod === "REGULAR") {
        const winnerAt90 =
            input.homeScore > input.awayScore
                ? input.homeTeamName
                : input.awayTeamName;

        if (advancesTeamName !== winnerAt90) {
            return {
                status: "error",
                message:
                    "Con método REGULAR, el clasificado debe coincidir con el ganador a 90 minutos.",
            };
        }
    }

    return {
        status: "success",
        values: {
            advancesTeamName,
            resolutionMethod,
        },
    };
}
