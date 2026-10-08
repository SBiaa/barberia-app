"use server";

import { randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import {
  agendamento,
  barbeiro,
  bloqueio,
  cliente,
  horarioFuncionamento,
  servico,
} from "@/db/schema";
import { ehConflitoDeHorario } from "@/lib/erros";
import { reaisParaCentavos } from "@/lib/dinheiro";
import { exigirSessao } from "@/lib/sessao";
import { horaParaMin, instanteLocal, ymdValido } from "@/lib/tempo";
import { normalizarWhatsapp } from "@/lib/whatsapp";

export type Res = { ok: true } | { ok: false; erro: string };
const ok: Res = { ok: true };
const falha = (erro: string): Res => ({ ok: false, erro });

function texto(f: FormData, k: string) {
  return String(f.get(k) ?? "").trim();
}

// ---------- Agenda ----------

export async function mudarStatus(id: string, status: "atendido" | "faltou" | "cancelado" | "agendado"): Promise<Res> {
  await exigirSessao();
  if (!z.uuid().safeParse(id).success) return falha("Agendamento inválido.");
  try {
    await db.update(agendamento).set({ status }).where(eq(agendamento.id, id));
  } catch (e) {
    if (ehConflitoDeHorario(e)) return falha("Esse horário já foi ocupado por outro agendamento.");
    throw e;
  }
  revalidatePath("/painel");
  return ok;
}

export async function remarcarAdmin(id: string, dia: string, hora: string): Promise<Res> {
  await exigirSessao();
  if (!z.uuid().safeParse(id).success || !ymdValido(dia) || !/^\d{2}:\d{2}$/.test(hora)) {
    return falha("Dados inválidos.");
  }
  const [ag] = await db.select().from(agendamento).where(eq(agendamento.id, id));
  if (!ag) return falha("Agendamento não encontrado.");
  const dur = ag.fim.getTime() - ag.inicio.getTime();
  const inicio = instanteLocal(dia, horaParaMin(hora));
  try {
    await db.update(agendamento).set({ inicio, fim: new Date(inicio.getTime() + dur) }).where(eq(agendamento.id, id));
  } catch (e) {
    if (ehConflitoDeHorario(e)) return falha("Já existe um agendamento nesse horário.");
    throw e;
  }
  revalidatePath("/painel");
  return ok;
}

/** O dono pode encaixar fora da grade (ex.: cliente que chegou na hora), mas não sobrepor outro. */
export async function criarAgendamentoAdmin(f: FormData): Promise<Res> {
  await exigirSessao();
  const p = z
    .object({
      servicoId: z.uuid(),
      barbeiroId: z.uuid(),
      dia: z.string().refine(ymdValido),
      hora: z.string().regex(/^\d{2}:\d{2}$/),
      nome: z.string().trim().min(2).max(80),
    })
    .safeParse({
      servicoId: texto(f, "servicoId"),
      barbeiroId: texto(f, "barbeiroId"),
      dia: texto(f, "dia"),
      hora: texto(f, "hora"),
      nome: texto(f, "nome"),
    });
  if (!p.success) return falha("Preencha todos os campos corretamente.");
  const whatsapp = normalizarWhatsapp(texto(f, "whatsapp"));
  if (!whatsapp) return falha("WhatsApp inválido.");

  const [srv] = await db.select().from(servico).where(eq(servico.id, p.data.servicoId));
  if (!srv) return falha("Serviço não encontrado.");
  const inicio = instanteLocal(p.data.dia, horaParaMin(p.data.hora));

  const [cli] = await db
    .insert(cliente)
    .values({ nome: p.data.nome, whatsapp })
    .onConflictDoUpdate({ target: cliente.whatsapp, set: { nome: p.data.nome } })
    .returning();
  try {
    await db.insert(agendamento).values({
      clienteId: cli.id,
      barbeiroId: p.data.barbeiroId,
      servicoId: srv.id,
      inicio,
      fim: new Date(inicio.getTime() + srv.duracaoMin * 60_000),
      precoCentavos: srv.precoCentavos,
      token: randomBytes(24).toString("base64url"),
    });
  } catch (e) {
    if (ehConflitoDeHorario(e)) return falha("Já existe um agendamento nesse horário.");
    throw e;
  }
  revalidatePath("/painel");
  return ok;
}

// ---------- Bloqueios ----------

export async function criarBloqueio(f: FormData): Promise<Res> {
  await exigirSessao();
  const barbeiroId = texto(f, "barbeiroId");
  const dia = texto(f, "dia");
  const diaTodo = f.get("diaTodo") === "on";
  const de = diaTodo ? "00:00" : texto(f, "de");
  const ate = diaTodo ? "24:00" : texto(f, "ate");
  if (!z.uuid().safeParse(barbeiroId).success || !ymdValido(dia)) return falha("Dados inválidos.");
  const ini = horaParaMin(de);
  const fim = horaParaMin(ate);
  if (Number.isNaN(ini) || Number.isNaN(fim) || fim <= ini) return falha("O fim precisa ser depois do início.");

  const inicio = instanteLocal(dia, ini);
  const fimI = instanteLocal(dia, fim);
  await db.insert(bloqueio).values({ barbeiroId, inicio, fim: fimI, motivo: texto(f, "motivo") || null });

  // Agendamentos já marcados dentro do bloqueio continuam valendo (o dono remarca/cancela na agenda).
  revalidatePath("/painel/bloqueios");
  revalidatePath("/painel");
  return ok;
}

export async function removerBloqueio(id: string): Promise<Res> {
  await exigirSessao();
  if (!z.uuid().safeParse(id).success) return falha("Bloqueio inválido.");
  await db.delete(bloqueio).where(eq(bloqueio.id, id));
  revalidatePath("/painel/bloqueios");
  return ok;
}

// ---------- Cadastros ----------

export async function salvarServico(f: FormData): Promise<Res> {
  await exigirSessao();
  const id = texto(f, "id");
  const nome = texto(f, "nome");
  const preco = reaisParaCentavos(texto(f, "preco"));
  const duracao = Number(texto(f, "duracaoMin"));
  if (nome.length < 2 || preco === null || !Number.isInteger(duracao) || duracao < 5 || duracao > 480) {
    return falha("Confira nome, preço (ex.: 35,00) e duração em minutos.");
  }
  if (id) {
    await db.update(servico).set({ nome, precoCentavos: preco, duracaoMin: duracao }).where(eq(servico.id, id));
  } else {
    await db.insert(servico).values({ nome, precoCentavos: preco, duracaoMin: duracao });
  }
  revalidatePath("/painel/cadastros");
  return ok;
}

export async function alternarServico(id: string, ativo: boolean): Promise<Res> {
  await exigirSessao();
  await db.update(servico).set({ ativo }).where(eq(servico.id, id));
  revalidatePath("/painel/cadastros");
  return ok;
}

export async function salvarBarbeiro(f: FormData): Promise<Res> {
  await exigirSessao();
  const id = texto(f, "id");
  const nome = texto(f, "nome");
  const comissao = Number(texto(f, "comissaoPct") || 0);
  if (nome.length < 2 || !Number.isInteger(comissao) || comissao < 0 || comissao > 100) {
    return falha("Confira o nome e a comissão (0 a 100%).");
  }
  if (id) {
    await db.update(barbeiro).set({ nome, comissaoPct: comissao }).where(eq(barbeiro.id, id));
  } else {
    await db.insert(barbeiro).values({ nome, comissaoPct: comissao });
  }
  revalidatePath("/painel/cadastros");
  return ok;
}

export async function alternarBarbeiro(id: string, ativo: boolean): Promise<Res> {
  await exigirSessao();
  await db.update(barbeiro).set({ ativo }).where(eq(barbeiro.id, id));
  revalidatePath("/painel/cadastros");
  return ok;
}

/**
 * Recebe a grade semanal inteira de um barbeiro. Campos: `d{0..6}` = texto com faixas
 * "09:00-12:00, 13:00-19:00" (vazio = folga).
 */
export async function salvarHorarios(barbeiroId: string, f: FormData): Promise<Res> {
  await exigirSessao();
  if (!z.uuid().safeParse(barbeiroId).success) return falha("Barbeiro inválido.");

  const linhas: { barbeiroId: string; diaSemana: number; abreMin: number; fechaMin: number }[] = [];
  for (let dia = 0; dia < 7; dia++) {
    const bruto = texto(f, `d${dia}`);
    if (!bruto) continue;
    const faixas: [number, number][] = [];
    for (const parte of bruto.split(",")) {
      const m = parte.trim().match(/^(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})$/);
      if (!m) return falha(`Formato inválido no dia ${dia + 1}. Use 09:00-12:00, 13:00-19:00.`);
      const a = Number(m[1]) * 60 + Number(m[2]);
      const b = Number(m[3]) * 60 + Number(m[4]);
      if (a >= b || b > 1440 || Number(m[2]) > 59 || Number(m[4]) > 59) return falha(`Faixa inválida: ${parte.trim()}`);
      faixas.push([a, b]);
    }
    faixas.sort((x, y) => x[0] - y[0]);
    for (let i = 1; i < faixas.length; i++) {
      if (faixas[i][0] < faixas[i - 1][1]) return falha("As faixas de um mesmo dia não podem se sobrepor.");
    }
    for (const [a, b] of faixas) linhas.push({ barbeiroId, diaSemana: dia, abreMin: a, fechaMin: b });
  }

  // neon-http não tem transação: apaga e insere em um único batch atômico.
  const apagar = db.delete(horarioFuncionamento).where(eq(horarioFuncionamento.barbeiroId, barbeiroId));
  if (linhas.length) {
    await db.batch([apagar, db.insert(horarioFuncionamento).values(linhas)]);
  } else {
    await apagar;
  }
  revalidatePath("/painel/cadastros");
  return ok;
}
