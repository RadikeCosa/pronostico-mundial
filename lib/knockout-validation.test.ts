import { describe, expect, it } from "vitest";
import { validateKnockoutWriteValues } from "./knockout-validation";

function createBaseInput() {
    return {
        stage: "ROUND_OF_32",
        homeTeamName: "Germany",
        awayTeamName: "Paraguay",
        homeScore: 1,
        awayScore: 1,
        advancesTeamNameRaw: "Paraguay",
        resolutionMethodRaw: "PENALTIES",
    } as const;
}

describe("validateKnockoutWriteValues", () => {
    it("does not require advancing team or method for group matches", () => {
        const result = validateKnockoutWriteValues({
            ...createBaseInput(),
            stage: "GROUP",
            advancesTeamNameRaw: null,
            resolutionMethodRaw: null,
        });

        expect(result).toEqual({
            status: "success",
            values: {
                advancesTeamName: null,
                resolutionMethod: null,
            },
        });
    });

    it("rejects knockout writes without advancing team", () => {
        const result = validateKnockoutWriteValues({
            ...createBaseInput(),
            advancesTeamNameRaw: "",
        });

        expect(result).toEqual({
            status: "error",
            message: "En eliminación directa debés indicar qué equipo clasifica.",
        });
    });

    it("rejects knockout writes without resolution method", () => {
        const result = validateKnockoutWriteValues({
            ...createBaseInput(),
            resolutionMethodRaw: "",
        });

        expect(result).toEqual({
            status: "error",
            message: "En eliminación directa debés indicar el método de resolución.",
        });
    });

    it("rejects advancing teams that are not part of the match", () => {
        const result = validateKnockoutWriteValues({
            ...createBaseInput(),
            advancesTeamNameRaw: "Brazil",
        });

        expect(result).toEqual({
            status: "error",
            message:
                "El equipo clasificado debe coincidir con uno de los dos equipos del partido.",
        });
    });

    it("rejects non-draw scores with EXTRA_TIME", () => {
        const result = validateKnockoutWriteValues({
            ...createBaseInput(),
            homeScore: 2,
            awayScore: 1,
            advancesTeamNameRaw: "Germany",
            resolutionMethodRaw: "EXTRA_TIME",
        });

        expect(result).toEqual({
            status: "error",
            message: "Con marcador no empatado a 90, el método debe ser REGULAR.",
        });
    });

    it("rejects non-draw scores with PENALTIES", () => {
        const result = validateKnockoutWriteValues({
            ...createBaseInput(),
            homeScore: 2,
            awayScore: 1,
            advancesTeamNameRaw: "Germany",
            resolutionMethodRaw: "PENALTIES",
        });

        expect(result).toEqual({
            status: "error",
            message: "Con marcador no empatado a 90, el método debe ser REGULAR.",
        });
    });

    it("rejects draw scores with REGULAR", () => {
        const result = validateKnockoutWriteValues({
            ...createBaseInput(),
            resolutionMethodRaw: "REGULAR",
        });

        expect(result).toEqual({
            status: "error",
            message:
                "Con marcador empatado a 90, el método debe ser EXTRA_TIME o PENALTIES.",
        });
    });

    it("rejects REGULAR when advancing team does not match winner at 90", () => {
        const result = validateKnockoutWriteValues({
            ...createBaseInput(),
            homeScore: 2,
            awayScore: 1,
            advancesTeamNameRaw: "Paraguay",
            resolutionMethodRaw: "REGULAR",
        });

        expect(result).toEqual({
            status: "error",
            message:
                "Con método REGULAR, el clasificado debe coincidir con el ganador a 90 minutos.",
        });
    });

    it("accepts draw + EXTRA_TIME + advancing team", () => {
        const result = validateKnockoutWriteValues({
            ...createBaseInput(),
            resolutionMethodRaw: "EXTRA_TIME",
        });

        expect(result).toEqual({
            status: "success",
            values: {
                advancesTeamName: "Paraguay",
                resolutionMethod: "EXTRA_TIME",
            },
        });
    });

    it("accepts draw + PENALTIES + advancing team", () => {
        const result = validateKnockoutWriteValues(createBaseInput());

        expect(result).toEqual({
            status: "success",
            values: {
                advancesTeamName: "Paraguay",
                resolutionMethod: "PENALTIES",
            },
        });
    });
});
