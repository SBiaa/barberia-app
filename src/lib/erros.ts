/** Violação de constraint de exclusão (horário já ocupado) no Postgres. */
export function ehConflitoDeHorario(e: unknown): boolean {
  let atual: unknown = e;
  for (let i = 0; i < 4 && atual; i++) {
    if ((atual as { code?: string }).code === "23P01") return true;
    atual = (atual as { cause?: unknown }).cause;
  }
  return false;
}
