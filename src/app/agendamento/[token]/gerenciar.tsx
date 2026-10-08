"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { buscarHorariosRemarcacao, cancelarPorToken, remarcarPorToken } from "@/app/actions/agendar";
import { formatarDataLonga, hoje, somarDias } from "@/lib/tempo";

type Slot = { hora: string; inicio: string };

export function Gerenciar({ token }: { token: string }) {
  const router = useRouter();
  const [modo, setModo] = useState<"nenhum" | "remarcar" | "cancelar">("nenhum");
  const [dia, setDia] = useState(hoje());
  const [busca, setBusca] = useState<{ dia: string; slots: Slot[] }>();
  const slots = busca?.dia === dia ? busca.slots : null;
  const [erro, setErro] = useState<string>();
  const [pendente, iniciar] = useTransition();
  const dias = Array.from({ length: 14 }, (_, i) => somarDias(hoje(), i));

  useEffect(() => {
    if (modo !== "remarcar") return;
    let ativo = true;
    buscarHorariosRemarcacao(token, dia).then((r) => ativo && setBusca({ dia, slots: r }));
    return () => {
      ativo = false;
    };
  }, [modo, dia, token]);

  function remarcar(inicio: string) {
    setErro(undefined);
    iniciar(async () => {
      const r = await remarcarPorToken(token, inicio);
      if (r.ok) {
        setModo("nenhum");
        router.refresh();
      } else setErro(r.erro);
    });
  }

  function cancelar() {
    setErro(undefined);
    iniciar(async () => {
      const r = await cancelarPorToken(token);
      if (r.ok) router.refresh();
      else setErro(r.erro);
    });
  }

  return (
    <div className="mt-4 space-y-3">
      {modo === "nenhum" && (
        <div className="grid grid-cols-2 gap-2">
          <button className="btn" onClick={() => setModo("remarcar")}>
            Remarcar
          </button>
          <button className="btn btn-perigo" onClick={() => setModo("cancelar")}>
            Cancelar
          </button>
        </div>
      )}

      {modo === "cancelar" && (
        <div className="card space-y-3">
          <p className="text-sm">Tem certeza que deseja cancelar este horário?</p>
          <div className="grid grid-cols-2 gap-2">
            <button className="btn" onClick={() => setModo("nenhum")}>
              Voltar
            </button>
            <button className="btn btn-perigo" disabled={pendente} onClick={cancelar}>
              Sim, cancelar
            </button>
          </div>
        </div>
      )}

      {modo === "remarcar" && (
        <div className="card space-y-3">
          <h3 className="titulo text-sm">Novo horário</h3>
          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
            {dias.map((d) => {
              const [, m, dd] = d.split("-");
              return (
                <button
                  key={d}
                  onClick={() => setDia(d)}
                  className={`btn min-w-16 shrink-0 flex-col !px-2 ${dia === d ? "btn-primario" : ""}`}
                >
                  <span className="text-[10px] uppercase">{formatarDataLonga(d).slice(0, 3)}</span>
                  <span>
                    {dd}/{m}
                  </span>
                </button>
              );
            })}
          </div>
          {slots === null ? (
            <p className="text-sm text-muted">Buscando horários…</p>
          ) : slots.length === 0 ? (
            <p className="text-sm text-muted">Sem horários livres neste dia.</p>
          ) : (
            <div className="grid grid-cols-4 gap-2">
              {slots.map((s) => (
                <button key={s.inicio} className="btn !px-0" disabled={pendente} onClick={() => remarcar(s.inicio)}>
                  {s.hora}
                </button>
              ))}
            </div>
          )}
          <button className="btn w-full" onClick={() => setModo("nenhum")}>
            Voltar
          </button>
        </div>
      )}

      {erro && (
        <p role="alert" className="text-sm text-danger">
          {erro}
        </p>
      )}
    </div>
  );
}
