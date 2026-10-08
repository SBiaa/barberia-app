"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";

export default function Entrar() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string>();
  const [carregando, setCarregando] = useState(false);

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    setErro(undefined);
    setCarregando(true);
    const { error } = await authClient.signIn.email({ email, password: senha });
    setCarregando(false);
    if (error) return setErro("E-mail ou senha incorretos.");
    router.replace("/painel");
    router.refresh();
  }

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-4 py-8">
      <h1 className="titulo mb-6 text-center text-xl">Painel da barbearia</h1>
      <form onSubmit={entrar} className="card space-y-3">
        <div>
          <label className="rotulo" htmlFor="email">E-mail</label>
          <input id="email" type="email" className="campo" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" required />
        </div>
        <div>
          <label className="rotulo" htmlFor="senha">Senha</label>
          <input id="senha" type="password" className="campo" value={senha} onChange={(e) => setSenha(e.target.value)} autoComplete="current-password" required />
        </div>
        {erro && <p role="alert" className="text-sm text-danger">{erro}</p>}
        <button className="btn btn-primario w-full" disabled={carregando}>
          {carregando ? "Entrando…" : "Entrar"}
        </button>
      </form>
    </main>
  );
}
