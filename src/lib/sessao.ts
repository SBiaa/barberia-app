import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { barbeiro } from "@/db/schema";
import { auth } from "./auth";

export type Sessao = {
  userId: string;
  nome: string;
  /** Preenchido quando o usuário é um barbeiro; null = administrador (dono). */
  barbeiroId: string | null;
  ehAdmin: boolean;
};

/** Usuário ligado a um barbeiro vê só os próprios dados; qualquer outro usuário é administrador. */
async function carregar(): Promise<Sessao | "inativo" | null> {
  const s = await auth.api.getSession({ headers: await headers() });
  if (!s) return null;
  const [b] = await db.select().from(barbeiro).where(eq(barbeiro.userId, s.user.id));
  if (b && !b.ativo) return "inativo";
  return { userId: s.user.id, nome: s.user.name, barbeiroId: b?.id ?? null, ehAdmin: !b };
}

/** Verificação real de sessão (o proxy faz apenas checagem otimista de cookie). Para páginas. */
export async function exigirSessao(): Promise<Sessao> {
  const s = await carregar();
  if (!s || s === "inativo") redirect("/entrar");
  return s;
}

/** Para páginas só do administrador: barbeiro volta para a própria agenda. */
export async function exigirAdmin(): Promise<Sessao> {
  const s = await exigirSessao();
  if (!s.ehAdmin) redirect("/painel");
  return s;
}

/** Para Server Actions: lança erro em vez de redirecionar. */
export async function exigirSessaoAcao(): Promise<Sessao> {
  const s = await carregar();
  if (!s || s === "inativo") throw new Error("Sessão expirada. Entre novamente.");
  return s;
}

export async function exigirAdminAcao(): Promise<Sessao> {
  const s = await exigirSessaoAcao();
  if (!s.ehAdmin) throw new Error("Acesso restrito ao administrador.");
  return s;
}

/** Admin acessa qualquer barbeiro; barbeiro, somente o próprio. */
export function podeAcessarBarbeiro(s: Sessao, barbeiroId: string): boolean {
  return s.ehAdmin || s.barbeiroId === barbeiroId;
}
