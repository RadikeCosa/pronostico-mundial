export function normalizeParticipantName(name: string): string {
  return name.trim().replace(/\s+/g, " ");
}

export function normalizeNameForLogin(name: string): string {
  return normalizeParticipantName(name).toLocaleLowerCase("es");
}

export function slugifyParticipantName(name: string): string {
  const normalized = normalizeNameForLogin(name)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return normalized || "participante";
}
