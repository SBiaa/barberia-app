"use client";

import { useRouter } from "next/navigation";
import { marcarMensagemEnviada } from "@/app/actions/painel";

export function BotoesWhatsapp({
  id,
  lembrete,
  avaliacao,
  lembreteEnviado,
  avaliacaoEnviada,
}: {
  id: string;
  lembrete?: string;
  avaliacao?: string;
  lembreteEnviado: boolean;
  avaliacaoEnviada: boolean;
}) {
  const router = useRouter();
  const botao = (href: string, rotulo: string, enviado: boolean, tipo: "lembrete" | "avaliacao") => (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="btn !min-h-9 !px-3 text-xs"
      onClick={() => marcarMensagemEnviada(id, tipo).then(() => router.refresh())}
    >
      {enviado ? "✓ " : ""}
      {rotulo}
    </a>
  );
  if (!lembrete && !avaliacao) return null;
  return (
    <div className="flex flex-wrap justify-end gap-2">
      {lembrete && botao(lembrete, "Lembrar no WhatsApp", lembreteEnviado, "lembrete")}
      {avaliacao && botao(avaliacao, "Pedir avaliação", avaliacaoEnviada, "avaliacao")}
    </div>
  );
}
