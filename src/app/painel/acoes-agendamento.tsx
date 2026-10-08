"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { mudarStatus, remarcarAdmin } from "@/app/actions/painel";

type Status = "agendado" | "atendido" | "faltou" | "cancelado";

export function AcoesAgendamento({ id, status, dia, hora }: { id: string; status: Status; dia: string; hora: string }) {
  const router = useRouter();
  const [pendente, iniciar] = useTransition();
  const [erro, setErro] = useState<string>();
  const [remarcando, setRemarcando] = useState(false);
  const [novoDia, setNovoDia] = useState(dia);
  const [novaHora, setNovaHora] = useState(hora);

  function executar(fn: () => Promise<{ ok: boolean; erro?: string }>) {
    setErro(undefined);
    iniciar(async () => {
      const r = await fn();
      if (r.ok) {
        setRemarcando(false);
        router.refresh();
      } else setErro(r.erro);
    });
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex flex-wrap justify-end gap-2">
        {status === "agendado" && (
          <>
            <button className="btn !min-h-9 !px-3" disabled={pendente} onClick={() => executar(() => mudarStatus(id, "atendido"))}>Atendido</button>
            <button className="btn !min-h-9 !px-3" disabled={pendente} onClick={() => executar(() => mudarStatus(id, "faltou"))}>Faltou</button>
            <button className="btn !min-h-9 !px-3" disabled={pendente} onClick={() => setRemarcando((v) => !v)}>Remarcar</button>
            <button className="btn btn-perigo !min-h-9 !px-3" disabled={pendente}
              onClick={() => confirm("Cancelar este agendamento?") && executar(() => mudarStatus(id, "cancelado"))}>
              Cancelar
            </button>
          </>
        )}
        {status !== "agendado" && (
          <button className="btn !min-h-9 !px-3" disabled={pendente} onClick={() => executar(() => mudarStatus(id, "agendado"))}>
            Reabrir
          </button>
        )}
      </div>
      {remarcando && (
        <div className="flex flex-wrap items-center justify-end gap-2">
          <input type="date" className="campo !min-h-9 !w-auto" value={novoDia} onChange={(e) => setNovoDia(e.target.value)} />
          <input type="time" className="campo !min-h-9 !w-auto" value={novaHora} onChange={(e) => setNovaHora(e.target.value)} />
          <button className="btn btn-primario !min-h-9 !px-3" disabled={pendente} onClick={() => executar(() => remarcarAdmin(id, novoDia, novaHora))}>
            Salvar
          </button>
        </div>
      )}
      {erro && <p role="alert" className="text-xs text-danger">{erro}</p>}
    </div>
  );
}
