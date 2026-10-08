"use server";

import { randomBytes } from "node:crypto";
import { and, eq, gt, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { agendamento, barbeiro, cliente, servico } from "@/db/schema";
import { horariosLivres } from "@/lib/disponibilidade";
import { ehConflitoDeHorario } from "@/lib/erros";
import { ymdDe } from "@/lib/tempo";
import { normalizarWhatsapp } from "@/lib/whatsapp";

export type Resultado = { ok: true; token: string } | { ok: false; erro: string };

const MSG_OCUPADO = "Esse horário acabou de ser ocupado. Escolha outro, por favor.";
const MAX_FUTUROS_POR_CLIENTE = 3;

const entrada = z.object({
  servicoId: z.uuid(),
  barbeiroId: z.uuid(),
  inicio: z.iso.datetime(),
  nome: z.string().trim().min(2, "Informe seu nome").max(80),
  whatsapp: z.string(),
});

export async function criarAgendamento(dados: unknown): Promise<Resultado> {
  const p = entrada.safeParse(dados);
  if (!p.success) return { ok: false, erro: p.error.issues[0]?.message ?? "Dados inválidos." };
  const { servicoId, barbeiroId, nome } = p.data;
  const whatsapp = normalizarWhatsapp(p.data.whatsapp);
  if (!whatsapp) return { ok: false, erro: "WhatsApp inválido. Use DDD + número." };

  const [srv] = await db.select().from(servico).where(and(eq(servico.id, servicoId), eq(servico.ativo, true)));
  const [bar] = await db.select().from(barbeiro).where(and(eq(barbeiro.id, barbeiroId), eq(barbeiro.ativo, true)));
  if (!srv || !bar) return { ok: false, erro: "Serviço ou barbeiro indisponível." };

  const inicio = new Date(p.data.inicio);
  const livres = await horariosLivres(barbeiroId, ymdDe(inicio), srv.duracaoMin);
  if (!livres.some((s) => new Date(s.inicio).getTime() === inicio.getTime())) {
    return { ok: false, erro: MSG_OCUPADO };
  }

  const [cli] = await db
    .insert(cliente)
    .values({ nome, whatsapp })
    .onConflictDoUpdate({ target: cliente.whatsapp, set: { nome } })
    .returning();

  const [futuros] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(agendamento)
    .where(
      and(eq(agendamento.clienteId, cli.id), eq(agendamento.status, "agendado"), gt(agendamento.inicio, new Date())),
    );
  if (futuros.n >= MAX_FUTUROS_POR_CLIENTE) {
    return { ok: false, erro: "Você já tem agendamentos em aberto. Cancele um antes de marcar outro." };
  }

  const token = randomBytes(24).toString("base64url");
  try {
    await db.insert(agendamento).values({
      clienteId: cli.id,
      barbeiroId,
      servicoId,
      inicio,
      fim: new Date(inicio.getTime() + srv.duracaoMin * 60_000),
      precoCentavos: srv.precoCentavos,
      token,
    });
  } catch (e) {
    if (ehConflitoDeHorario(e)) return { ok: false, erro: MSG_OCUPADO };
    throw e;
  }
  return { ok: true, token };
}

export async function cancelarPorToken(token: string): Promise<{ ok: boolean; erro?: string }> {
  const r = await db
    .update(agendamento)
    .set({ status: "cancelado" })
    .where(and(eq(agendamento.token, token), eq(agendamento.status, "agendado"), gt(agendamento.inicio, new Date())))
    .returning({ id: agendamento.id });
  return r.length ? { ok: true } : { ok: false, erro: "Não foi possível cancelar este agendamento." };
}

export async function remarcarPorToken(token: string, inicioIso: string): Promise<{ ok: boolean; erro?: string }> {
  const parsed = z.iso.datetime().safeParse(inicioIso);
  if (!parsed.success) return { ok: false, erro: "Horário inválido." };
  const [ag] = await db
    .select()
    .from(agendamento)
    .where(and(eq(agendamento.token, token), eq(agendamento.status, "agendado")));
  if (!ag || ag.inicio <= new Date()) return { ok: false, erro: "Este agendamento não pode mais ser remarcado." };

  const duracaoMs = ag.fim.getTime() - ag.inicio.getTime();
  const inicio = new Date(parsed.data);
  const livres = await horariosLivres(ag.barbeiroId, ymdDe(inicio), duracaoMs / 60_000, ag.id);
  if (!livres.some((s) => new Date(s.inicio).getTime() === inicio.getTime())) {
    return { ok: false, erro: MSG_OCUPADO };
  }
  try {
    await db
      .update(agendamento)
      .set({ inicio, fim: new Date(inicio.getTime() + duracaoMs) })
      .where(eq(agendamento.id, ag.id));
  } catch (e) {
    if (ehConflitoDeHorario(e)) return { ok: false, erro: MSG_OCUPADO };
    throw e;
  }
  return { ok: true };
}

/** Horários livres para o fluxo público. */
export async function buscarHorarios(barbeiroId: string, servicoId: string, ymd: string) {
  if (!z.uuid().safeParse(barbeiroId).success || !z.uuid().safeParse(servicoId).success) return [];
  const [srv] = await db.select().from(servico).where(and(eq(servico.id, servicoId), eq(servico.ativo, true)));
  if (!srv) return [];
  return horariosLivres(barbeiroId, ymd, srv.duracaoMin);
}

/** Horários livres para remarcar (ignora o próprio agendamento). */
export async function buscarHorariosRemarcacao(token: string, ymd: string) {
  const [ag] = await db
    .select()
    .from(agendamento)
    .where(and(eq(agendamento.token, token), eq(agendamento.status, "agendado")));
  if (!ag) return [];
  return horariosLivres(ag.barbeiroId, ymd, (ag.fim.getTime() - ag.inicio.getTime()) / 60_000, ag.id);
}
