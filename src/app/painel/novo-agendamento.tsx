"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { criarAgendamentoAdmin } from "@/app/actions/painel";

type Opcao = { id: string; nome: string };

export function NovoAgendamento({ dia, barbeiros, servicos }: { dia: string; barbeiros: Opcao[]; servicos: Opcao[] }) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [erro, setErro] = useState<string>();
  const [pendente, iniciar] = useTransition();

  if (!aberto) {
    return (
      <button className="btn" onClick={() => setAberto(true)} disabled={!barbeiros.length || !servicos.length}>
        + Novo agendamento
      </button>
    );
  }

  return (
    <form
      className="card grid gap-3 sm:grid-cols-2"
      action={(f) => {
        setErro(undefined);
        iniciar(async () => {
          const r = await criarAgendamentoAdmin(f);
          if (r.ok) {
            setAberto(false);
            router.refresh();
          } else setErro(r.erro);
        });
      }}
    >
      <div><label className="rotulo">Cliente</label><input name="nome" className="campo" required minLength={2} /></div>
      <div><label className="rotulo">WhatsApp</label><input name="whatsapp" className="campo" inputMode="tel" required /></div>
      <div>
        <label className="rotulo">Serviço</label>
        <select name="servicoId" className="campo" required>
          {servicos.map((s) => <option key={s.id} value={s.id}>{s.nome}</option>)}
        </select>
      </div>
      <div>
        <label className="rotulo">Barbeiro</label>
        <select name="barbeiroId" className="campo" required>
          {barbeiros.map((b) => <option key={b.id} value={b.id}>{b.nome}</option>)}
        </select>
      </div>
      <div><label className="rotulo">Dia</label><input type="date" name="dia" defaultValue={dia} className="campo" required /></div>
      <div><label className="rotulo">Hora</label><input type="time" name="hora" className="campo" required /></div>
      {erro && <p role="alert" className="text-sm text-danger sm:col-span-2">{erro}</p>}
      <div className="flex gap-2 sm:col-span-2">
        <button className="btn btn-primario" disabled={pendente}>Salvar</button>
        <button type="button" className="btn" onClick={() => setAberto(false)}>Fechar</button>
      </div>
    </form>
  );
}
