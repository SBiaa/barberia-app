"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { buscarHorarios, criarAgendamento } from "@/app/actions/agendar";
import { formatarReais } from "@/lib/dinheiro";
import { formatarDataLonga, hoje, somarDias } from "@/lib/tempo";

type Servico = { id: string; nome: string; precoCentavos: number; duracaoMin: number };
type Barbeiro = { id: string; nome: string };
type Slot = { hora: string; inicio: string };

export function Agendar({ servicos, barbeiros }: { servicos: Servico[]; barbeiros: Barbeiro[] }) {
  const [servicoId, setServicoId] = useState<string>();
  const [barbeiroId, setBarbeiroId] = useState<string | undefined>(
    barbeiros.length === 1 ? barbeiros[0].id : undefined,
  );
  const [dia, setDia] = useState(hoje());
  const chave = `${barbeiroId}|${servicoId}|${dia}`;
  const [busca, setBusca] = useState<{ chave: string; slots: Slot[] }>();
  const slots = busca?.chave === chave ? busca.slots : null;
  const [escolhido, setEscolhido] = useState<{ chave: string; slot: Slot }>();
  const slot = escolhido?.chave === chave ? escolhido.slot : undefined;
  const setSlot = (s: Slot | undefined) => setEscolhido(s && { chave, slot: s });
  const [nome, setNome] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [erro, setErro] = useState<string>();
  const [pendente, iniciar] = useTransition();
  const router = useRouter();

  const servico = servicos.find((s) => s.id === servicoId);
  const dias = Array.from({ length: 14 }, (_, i) => somarDias(hoje(), i));

  useEffect(() => {
    if (!servicoId || !barbeiroId) return;
    let ativo = true;
    buscarHorarios(barbeiroId, servicoId, dia).then((r) => ativo && setBusca({ chave, slots: r }));
    return () => {
      ativo = false;
    };
  }, [servicoId, barbeiroId, dia, chave]);

  function confirmar() {
    if (!servicoId || !barbeiroId || !slot) return;
    setErro(undefined);
    iniciar(async () => {
      const r = await criarAgendamento({ servicoId, barbeiroId, inicio: slot.inicio, nome, whatsapp });
      if (r.ok) {
        router.push(`/agendamento/${r.token}?novo=1`);
        return;
      }
      setErro(r.erro);
      setBusca({ chave, slots: await buscarHorarios(barbeiroId, servicoId, dia) });
      setSlot(undefined);
    });
  }

  return (
    <div className="space-y-8">
      <section>
        <h2 className="titulo mb-3 text-sm">1. Serviço</h2>
        <div className="space-y-2">
          {servicos.map((s) => (
            <button
              key={s.id}
              onClick={() => setServicoId(s.id)}
              className={`card flex w-full items-center justify-between text-left transition ${
                servicoId === s.id ? "!border-silver-strong" : "hover:border-silver"
              }`}
            >
              <span>
                <span className="block font-medium">{s.nome}</span>
                <span className="text-sm text-muted">{s.duracaoMin} min</span>
              </span>
              <span className="font-medium text-silver-strong">{formatarReais(s.precoCentavos)}</span>
            </button>
          ))}
        </div>
      </section>

      {servico && barbeiros.length > 1 && (
        <section>
          <h2 className="titulo mb-3 text-sm">2. Barbeiro</h2>
          <div className="grid grid-cols-2 gap-2">
            {barbeiros.map((b) => (
              <button
                key={b.id}
                onClick={() => setBarbeiroId(b.id)}
                className={`card text-center ${barbeiroId === b.id ? "!border-silver-strong" : "hover:border-silver"}`}
              >
                {b.nome}
              </button>
            ))}
          </div>
        </section>
      )}

      {servico && barbeiroId && (
        <section>
          <h2 className="titulo mb-3 text-sm">{barbeiros.length > 1 ? "3" : "2"}. Dia e horário</h2>
          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-2">
            {dias.map((d) => {
              const [, m, dd] = d.split("-");
              return (
                <button
                  key={d}
                  onClick={() => setDia(d)}
                  className={`card min-w-16 shrink-0 !p-2 text-center ${dia === d ? "!border-silver-strong" : ""}`}
                >
                  <span className="block text-[10px] uppercase text-muted">
                    {formatarDataLonga(d).slice(0, 3)}
                  </span>
                  <span className="block font-medium">
                    {dd}/{m}
                  </span>
                </button>
              );
            })}
          </div>
          <div className="mt-3">
            {slots === null ? (
              <p className="text-sm text-muted">Buscando horários…</p>
            ) : slots.length === 0 ? (
              <p className="text-sm text-muted">Sem horários livres neste dia. Tente outro dia.</p>
            ) : (
              <div className="grid grid-cols-4 gap-2">
                {slots.map((s) => (
                  <button
                    key={s.inicio}
                    onClick={() => setSlot(s)}
                    className={`btn !px-0 ${slot?.inicio === s.inicio ? "btn-primario" : ""}`}
                  >
                    {s.hora}
                  </button>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {slot && servico && (
        <section>
          <h2 className="titulo mb-3 text-sm">Seus dados</h2>
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              confirmar();
            }}
          >
            <div>
              <label className="rotulo" htmlFor="nome">
                Nome
              </label>
              <input
                id="nome"
                className="campo"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                autoComplete="name"
                required
                minLength={2}
                maxLength={80}
              />
            </div>
            <div>
              <label className="rotulo" htmlFor="wpp">
                WhatsApp
              </label>
              <input
                id="wpp"
                className="campo"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                inputMode="tel"
                autoComplete="tel"
                placeholder="(11) 91234-5678"
                required
              />
            </div>
            <p className="text-xs text-muted">
              Usamos seu nome e WhatsApp apenas para confirmar e gerenciar este agendamento.
            </p>
            {erro && (
              <p role="alert" className="text-sm text-danger">
                {erro}
              </p>
            )}
            <button className="btn btn-primario w-full" disabled={pendente}>
              {pendente ? "Confirmando…" : `Confirmar ${formatarDataLonga(dia)} às ${slot.hora}`}
            </button>
          </form>
        </section>
      )}

      <footer className="pt-4 text-center text-xs text-muted">
        <Link href="/entrar" className="hover:text-silver">
          Acesso da barbearia
        </Link>
      </footer>
    </div>
  );
}
