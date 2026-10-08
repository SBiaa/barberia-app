"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { criarBloqueio, removerBloqueio } from "@/app/actions/painel";

export function FormBloqueio({ barbeiros, dia }: { barbeiros: { id: string; nome: string }[]; dia: string }) {
  const router = useRouter();
  const [diaTodo, setDiaTodo] = useState(false);
  const [erro, setErro] = useState<string>();
  const [pendente, iniciar] = useTransition();

  return (
    <form
      className="card grid gap-3 sm:grid-cols-2"
      action={(f) => {
        setErro(undefined);
        iniciar(async () => {
          const r = await criarBloqueio(f);
          if (r.ok) router.refresh();
          else setErro(r.erro);
        });
      }}
    >
      <div>
        <label className="rotulo">Barbeiro</label>
        <select name="barbeiroId" className="campo" required>
          {barbeiros.map((b) => <option key={b.id} value={b.id}>{b.nome}</option>)}
        </select>
      </div>
      <div><label className="rotulo">Dia</label><input type="date" name="dia" defaultValue={dia} className="campo" required /></div>
      <label className="flex items-center gap-2 text-sm sm:col-span-2">
        <input type="checkbox" name="diaTodo" checked={diaTodo} onChange={(e) => setDiaTodo(e.target.checked)} />
        Dia inteiro (folga)
      </label>
      {!diaTodo && (
        <>
          <div><label className="rotulo">Das</label><input type="time" name="de" defaultValue="12:00" className="campo" required /></div>
          <div><label className="rotulo">Até</label><input type="time" name="ate" defaultValue="13:00" className="campo" required /></div>
        </>
      )}
      <div className="sm:col-span-2">
        <label className="rotulo">Motivo (opcional)</label>
        <input name="motivo" className="campo" maxLength={120} />
      </div>
      {erro && <p role="alert" className="text-sm text-danger sm:col-span-2">{erro}</p>}
      <div className="sm:col-span-2">
        <button className="btn btn-primario" disabled={pendente || !barbeiros.length}>Bloquear</button>
      </div>
    </form>
  );
}

export function RemoverBloqueio({ id }: { id: string }) {
  const router = useRouter();
  const [pendente, iniciar] = useTransition();
  return (
    <button
      className="btn btn-perigo !min-h-9 !px-3"
      disabled={pendente}
      onClick={() =>
        iniciar(async () => {
          await removerBloqueio(id);
          router.refresh();
        })
      }
    >
      Remover
    </button>
  );
}
