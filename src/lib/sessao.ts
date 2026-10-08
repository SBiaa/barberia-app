import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "./auth";

/** Verificação real de sessão (o proxy faz apenas checagem otimista de cookie). */
export async function exigirSessao() {
  const sessao = await auth.api.getSession({ headers: await headers() });
  if (!sessao) redirect("/entrar");
  return sessao;
}
