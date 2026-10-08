"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  alternarBarbeiro,
  alternarServico,
  salvarBarbeiro,
  salvarHorarios,
  salvarLinkAvaliacao,
  salvarServico,
  type Res,
} from "@/app/actions/painel";
import { nomeDiaSemana } from "@/lib/tempo";

function useAcao() {
  const router = useRouter();
  const [erro, setErro] = useState<string>();
  const [msg, setMsg] = useState<string>();
  const [pendente, iniciar] = useTransition();
  function rodar(fn: () => Promise<Res>, aposOk?: () => void) {
    setErro(undefined);
    setMsg(undefined);
    iniciar(async () => {
      const r = await fn();
      if (r.ok) {
        setMsg("Salvo.");
        aposOk?.();
        router.refresh();
      } else setErro(r.erro);
    });
  }
  return { erro, msg, pendente, rodar };
}

export function ServicoForm({
  servico,
}: {
  servico?: { id: string; nome: string; precoCentavos: number; duracaoMin: number; ativo: boolean };
}) {
  const { erro, msg, pendente, rodar } = useAcao();
  const preco = servico ? (servico.precoCentavos / 100).toFixed(2).replace(".", ",") : "";
  return (
    <form
      key={servico ? `${servico.id}-${servico.nome}-${preco}-${servico.duracaoMin}` : "novo"}
      className={`card grid items-end gap-3 sm:grid-cols-[1fr_7rem_6rem_auto] ${servico && !servico.ativo ? "opacity-60" : ""}`}
      action={(f) => rodar(() => salvarServico(f), () => !servico && (document.activeElement as HTMLElement | null)?.blur())}
    >
      <input type="hidden" name="id" defaultValue={servico?.id ?? ""} />
      <div><label className="rotulo">{servico ? "Serviço" : "Novo serviço"}</label><input name="nome" className="campo" defaultValue={servico?.nome} required /></div>
      <div><label className="rotulo">Preço (R$)</label><input name="preco" className="campo" inputMode="decimal" defaultValue={preco} required /></div>
      <div><label className="rotulo">Duração (min)</label><input name="duracaoMin" className="campo" inputMode="numeric" defaultValue={servico?.duracaoMin} required /></div>
      <div className="flex gap-2">
        <button className="btn btn-primario" disabled={pendente}>{servico ? "Salvar" : "Adicionar"}</button>
        {servico && (
          <button type="button" className="btn" disabled={pendente} onClick={() => rodar(() => alternarServico(servico.id, !servico.ativo))}>
            {servico.ativo ? "Desativar" : "Ativar"}
          </button>
        )}
      </div>
      {(erro || msg) && <p role="alert" className={`text-sm sm:col-span-4 ${erro ? "text-danger" : "text-ok"}`}>{erro ?? msg}</p>}
    </form>
  );
}

export function BarbeiroForm({ barbeiro }: { barbeiro?: { id: string; nome: string; comissaoPct: number; ativo: boolean } }) {
  const { erro, msg, pendente, rodar } = useAcao();
  return (
    <form
      key={barbeiro ? `${barbeiro.id}-${barbeiro.nome}-${barbeiro.comissaoPct}` : "novo"}
      className={`${barbeiro ? "" : "card"} grid items-end gap-3 sm:grid-cols-[1fr_8rem_auto] ${barbeiro && !barbeiro.ativo ? "opacity-60" : ""}`}
      action={(f) => rodar(() => salvarBarbeiro(f))}
    >
      <input type="hidden" name="id" defaultValue={barbeiro?.id ?? ""} />
      <div><label className="rotulo">{barbeiro ? "Barbeiro" : "Novo barbeiro"}</label><input name="nome" className="campo" defaultValue={barbeiro?.nome} required /></div>
      <div><label className="rotulo">Comissão (%)</label><input name="comissaoPct" className="campo" inputMode="numeric" defaultValue={barbeiro?.comissaoPct ?? 0} /></div>
      <div className="flex gap-2">
        <button className="btn btn-primario" disabled={pendente}>{barbeiro ? "Salvar" : "Adicionar"}</button>
        {barbeiro && (
          <button type="button" className="btn" disabled={pendente} onClick={() => rodar(() => alternarBarbeiro(barbeiro.id, !barbeiro.ativo))}>
            {barbeiro.ativo ? "Desativar" : "Ativar"}
          </button>
        )}
      </div>
      {(erro || msg) && <p role="alert" className={`text-sm sm:col-span-3 ${erro ? "text-danger" : "text-ok"}`}>{erro ?? msg}</p>}
    </form>
  );
}

export function GradeHorarios({ barbeiroId, inicial }: { barbeiroId: string; inicial: string[] }) {
  const { erro, msg, pendente, rodar } = useAcao();
  // Ordem de exibição: segunda a domingo.
  const ordem = [1, 2, 3, 4, 5, 6, 0];
  return (
    <form className="space-y-2" action={(f) => rodar(() => salvarHorarios(barbeiroId, f))}>
      {ordem.map((d) => (
        <div key={d} className="grid grid-cols-[5.5rem_1fr] items-center gap-2">
          <label htmlFor={`${barbeiroId}-d${d}`} className="text-sm capitalize">{nomeDiaSemana(d)}</label>
          <input id={`${barbeiroId}-d${d}`} name={`d${d}`} className="campo !min-h-9" defaultValue={inicial[d]} placeholder="Folga" />
        </div>
      ))}
      {(erro || msg) && <p role="alert" className={`text-sm ${erro ? "text-danger" : "text-ok"}`}>{erro ?? msg}</p>}
      <button className="btn btn-primario" disabled={pendente}>Salvar horários</button>
    </form>
  );
}

export function LinkAvaliacaoForm({ atual }: { atual: string }) {
  const { erro, msg, pendente, rodar } = useAcao();
  return (
    <form className="card space-y-3" action={(f) => rodar(() => salvarLinkAvaliacao(f))}>
      <div>
        <label className="rotulo" htmlFor="linkGoogle">Link para avaliar no Google</label>
        <input
          id="linkGoogle"
          name="linkGoogle"
          className="campo"
          defaultValue={atual}
          placeholder="https://g.page/r/…/review"
          inputMode="url"
        />
      </div>
      {(erro || msg) && <p role="alert" className={`text-sm ${erro ? "text-danger" : "text-ok"}`}>{erro ?? msg}</p>}
      <button className="btn btn-primario" disabled={pendente}>Salvar</button>
    </form>
  );
}
