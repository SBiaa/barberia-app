import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { barbeiro, session, user } from "@/db/schema";
import { auth } from "./auth";

export const SENHA_MIN = 8;

/** Cria o login de um barbeiro (e-mail + senha) e liga ao cadastro dele. */
export async function criarAcessoBarbeiro(barbeiroId: string, email: string, senha: string): Promise<string | null> {
  const emailNorm = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailNorm)) return "E-mail inválido.";
  if (senha.length < SENHA_MIN) return `A senha precisa ter ao menos ${SENHA_MIN} caracteres.`;

  const [b] = await db.select().from(barbeiro).where(eq(barbeiro.id, barbeiroId));
  if (!b) return "Barbeiro não encontrado.";
  if (b.userId) return "Este barbeiro já tem acesso.";
  const [existe] = await db.select({ id: user.id }).from(user).where(eq(user.email, emailNorm));
  if (existe) return "Já existe um usuário com este e-mail.";

  const ctx = await auth.$context;
  const u = await ctx.internalAdapter.createUser(
    { name: b.nome, email: emailNorm, emailVerified: true } as never,
    undefined as never,
  );
  await ctx.internalAdapter.linkAccount({
    id: randomUUID(),
    userId: u.id,
    accountId: u.id,
    providerId: "credential",
    password: await ctx.password.hash(senha),
  });
  await db.update(barbeiro).set({ userId: u.id }).where(eq(barbeiro.id, barbeiroId));
  return null;
}

/** Remove o login do barbeiro (sessões caem junto); o cadastro e o histórico ficam. */
export async function removerAcessoBarbeiro(barbeiroId: string): Promise<void> {
  const [b] = await db.select().from(barbeiro).where(eq(barbeiro.id, barbeiroId));
  if (!b?.userId) return;
  await db.delete(user).where(eq(user.id, b.userId));
}

export async function redefinirSenhaBarbeiro(barbeiroId: string, senha: string): Promise<string | null> {
  if (senha.length < SENHA_MIN) return `A senha precisa ter ao menos ${SENHA_MIN} caracteres.`;
  const [b] = await db.select().from(barbeiro).where(eq(barbeiro.id, barbeiroId));
  if (!b?.userId) return "Este barbeiro não tem acesso.";
  const ctx = await auth.$context;
  await ctx.internalAdapter.updatePassword(b.userId, await ctx.password.hash(senha));
  await db.delete(session).where(eq(session.userId, b.userId));
  return null;
}
