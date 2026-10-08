"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { criarLancamento, removerLancamento } from "@/app/actions/painel";

const CATEGORIAS_SAIDA = ["Aluguel", "Produtos", "Luz", "Água", "Internet", "Equipamentos", "Marketing", "Outros"];
const CATEGORIAS_ENTRADA = ["Venda de produto", "Outros"];

export function FormLancamento({ hoje }: { hoje: string }) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [tipo, setTipo] = useState<"entrada" | "saida">("saida");
  const [erro, setErro] = useState<string>();
  const [pendente, iniciar] = useTransition();

  if (!aberto) {
    return (
      <button className="btn" onClick={() => setAberto(true)}>
        + Novo lançamento
      </button>
    );
  }
  const sugestoes = tipo === "saida" ? CATEGORIAS_SAIDA : CATEGORIAS_ENTRADA;

  return (
    <form
      className="card grid gap-3 sm:grid-cols-2"
      action={(f) => {
        setErro(undefined);
        iniciar(async () => {
          const r = await criarLancamento(f);
          if (r.ok) {
            setAberto(false);
            router.refresh();
          } else setErro(r.erro);
        });
      }}
    >
      <div className="grid grid-cols-2 gap-2 sm:col-span-2">
        {(["saida", "entrada"] as const).map((t) => (
          <label key={t} className={`btn cursor-pointer ${tipo === t ? "btn-primario" : ""}`}>
            <input type="radio" name="tipo" value={t} checked={tipo === t} onChange={() => setTipo(t)} className="sr-only" />
            {t === "saida" ? "Despesa" : "Entrada avulsa"}
          </label>
        ))}
      </div>
      <div>
        <label className="rotulo">Valor (R$)</label>
        <input name="valor" className="campo" inputMode="decimal" placeholder="0,00" required />
      </div>
      <div>
        <label className="rotulo">Categoria</label>
        <input name="categoria" className="campo" list="categorias" required />
        <datalist id="categorias">
          {sugestoes.map((c) => <option key={c} value={c} />)}
        </datalist>
      </div>
      <div>
        <label className="rotulo">Data</label>
        <input type="date" name="dia" className="campo" defaultValue={hoje} required />
      </div>
      <div>
        <label className="rotulo">Forma de pagamento</label>
        <select name="forma" className="campo" defaultValue="">
          <option value="">—</option>
          <option value="pix">Pix</option>
          <option value="dinheiro">Dinheiro</option>
          <option value="cartao">Cartão</option>
        </select>
      </div>
      <div className="sm:col-span-2">
        <label className="rotulo">Observação (opcional)</label>
        <input name="descricao" className="campo" maxLength={200} />
      </div>
      {erro && <p role="alert" className="text-sm text-danger sm:col-span-2">{erro}</p>}
      <div className="flex gap-2 sm:col-span-2">
        <button className="btn btn-primario" disabled={pendente}>Salvar</button>
        <button type="button" className="btn" onClick={() => setAberto(false)}>Fechar</button>
      </div>
    </form>
  );
}

export function RemoverLancamento({ id }: { id: string }) {
  const router = useRouter();
  const [pendente, iniciar] = useTransition();
  return (
    <button
      className="btn btn-perigo !min-h-9 !px-3"
      disabled={pendente}
      aria-label="Remover lançamento"
      onClick={() =>
        confirm("Remover este lançamento?") &&
        iniciar(async () => {
          await removerLancamento(id);
          router.refresh();
        })
      }
    >
      ✕
    </button>
  );
}
