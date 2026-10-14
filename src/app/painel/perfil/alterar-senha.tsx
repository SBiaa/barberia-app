"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth-client";

const MIN = 8;

export function AlterarSenha() {
  const [atual, setAtual] = useState("");
  const [nova, setNova] = useState("");
  const [confirma, setConfirma] = useState("");
  const [erro, setErro] = useState<string>();
  const [ok, setOk] = useState(false);
  const [carregando, setCarregando] = useState(false);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setErro(undefined);
    setOk(false);
    if (nova.length < MIN) return setErro(`A nova senha precisa ter ao menos ${MIN} caracteres.`);
    if (nova !== confirma) return setErro("A confirmação não confere com a nova senha.");
    if (nova === atual) return setErro("A nova senha precisa ser diferente da atual.");

    setCarregando(true);
    const { error } = await authClient.changePassword({
      currentPassword: atual,
      newPassword: nova,
      revokeOtherSessions: true,
    });
    setCarregando(false);
    if (error) {
      setErro(error.status === 400 ? "Senha atual incorreta." : "Não foi possível alterar a senha. Tente novamente.");
      return;
    }
    setAtual("");
    setNova("");
    setConfirma("");
    setOk(true);
  }

  return (
    <form onSubmit={salvar} className="card space-y-3">
      <div>
        <label className="rotulo" htmlFor="atual">Senha atual</label>
        <input id="atual" type="password" className="campo" value={atual} onChange={(e) => setAtual(e.target.value)} autoComplete="current-password" required />
      </div>
      <div>
        <label className="rotulo" htmlFor="nova">Nova senha (mín. {MIN} caracteres)</label>
        <input id="nova" type="password" className="campo" value={nova} onChange={(e) => setNova(e.target.value)} autoComplete="new-password" minLength={MIN} required />
      </div>
      <div>
        <label className="rotulo" htmlFor="confirma">Confirmar nova senha</label>
        <input id="confirma" type="password" className="campo" value={confirma} onChange={(e) => setConfirma(e.target.value)} autoComplete="new-password" minLength={MIN} required />
      </div>
      {erro && <p role="alert" className="text-sm text-danger">{erro}</p>}
      {ok && <p role="status" className="text-sm text-ok">Senha alterada. Outros aparelhos conectados foram desconectados.</p>}
      <button className="btn btn-primario" disabled={carregando}>
        {carregando ? "Salvando…" : "Alterar senha"}
      </button>
    </form>
  );
}
