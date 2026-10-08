import { and, eq, gt, inArray, lt, ne } from "drizzle-orm";
import { db } from "@/db";
import { agendamento, bloqueio, horarioFuncionamento } from "@/db/schema";
import { diaSemanaDe, instanteLocal, minParaHora, somarDias, hoje } from "./tempo";

export const PASSO_MIN = 15; // granularidade dos horários oferecidos
export const ANTECEDENCIA_MIN = 30; // não agenda para daqui a menos de 30 min
export const JANELA_DIAS = 30; // até quantos dias à frente

export type Slot = { hora: string; inicio: string };

/**
 * Horários realmente livres de um barbeiro num dia, para um serviço de `duracaoMin`.
 * `ignorarAgendamentoId` permite remarcar sem conflitar consigo mesmo.
 */
export async function horariosLivres(
  barbeiroId: string,
  ymd: string,
  duracaoMin: number,
  ignorarAgendamentoId?: string,
): Promise<Slot[]> {
  if (ymd < hoje() || ymd > somarDias(hoje(), JANELA_DIAS)) return [];

  const faixas = await db
    .select()
    .from(horarioFuncionamento)
    .where(
      and(
        eq(horarioFuncionamento.barbeiroId, barbeiroId),
        eq(horarioFuncionamento.diaSemana, diaSemanaDe(ymd)),
      ),
    );
  if (faixas.length === 0) return [];

  const diaIni = instanteLocal(ymd, 0);
  const diaFim = instanteLocal(somarDias(ymd, 1), 0);

  const [ocupados, bloqueios] = await Promise.all([
    db
      .select({ inicio: agendamento.inicio, fim: agendamento.fim })
      .from(agendamento)
      .where(
        and(
          eq(agendamento.barbeiroId, barbeiroId),
          inArray(agendamento.status, ["agendado", "atendido"]),
          lt(agendamento.inicio, diaFim),
          gt(agendamento.fim, diaIni),
          ignorarAgendamentoId ? ne(agendamento.id, ignorarAgendamentoId) : undefined,
        ),
      ),
    db
      .select({ inicio: bloqueio.inicio, fim: bloqueio.fim })
      .from(bloqueio)
      .where(
        and(
          eq(bloqueio.barbeiroId, barbeiroId),
          lt(bloqueio.inicio, diaFim),
          gt(bloqueio.fim, diaIni),
        ),
      ),
  ]);
  const impedimentos = [...ocupados, ...bloqueios];

  const minimo = Date.now() + ANTECEDENCIA_MIN * 60_000;
  const slots: Slot[] = [];
  for (const f of faixas.sort((a, b) => a.abreMin - b.abreMin)) {
    for (let m = f.abreMin; m + duracaoMin <= f.fechaMin; m += PASSO_MIN) {
      const ini = instanteLocal(ymd, m);
      const fim = new Date(ini.getTime() + duracaoMin * 60_000);
      if (ini.getTime() < minimo) continue;
      if (impedimentos.some((i) => ini < i.fim && fim > i.inicio)) continue;
      slots.push({ hora: minParaHora(m), inicio: ini.toISOString() });
    }
  }
  return slots;
}
