"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { anonimizarCliente } from "@/app/actions/painel";

export function BotaoAnonimizar({ id }: { id: string }) {
  const router = useRouter();
  const [erro, setErro] = useState<string>();
  const [pendente, iniciar] = useTransition();
  return (
    <div>
      <button
        className="btn btn-perigo"
        disabled={pendente}
        onClick={() =>
          confirm("Remover nome e WhatsApp deste cliente? Isso não pode ser desfeito.") &&
          iniciar(async () => {
            const r = await anonimizarCliente(id);
            if (r.ok) router.refresh();
            else setErro(r.erro);
          })
        }
      >
        Remover dados pessoais
      </button>
      {erro && <p role="alert" className="mt-2 text-sm text-danger">{erro}</p>}
    </div>
  );
}
