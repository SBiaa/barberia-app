import { formatarDataLonga, formatarHora, ymdDe } from "./tempo";
import { linkWhatsapp } from "./whatsapp";

const NOME_BARBEARIA = "Barbearia Adelson Cerqueira";
const primeiroNome = (n: string) => n.trim().split(/\s+/)[0];

export function msgLembrete(p: { nome: string; inicio: Date; servico: string; link: string }) {
  return (
    `Olá, ${primeiroNome(p.nome)}! Aqui é da ${NOME_BARBEARIA}. ` +
    `Lembrando do seu horário (${p.servico}) ${formatarDataLonga(ymdDe(p.inicio))} às ${formatarHora(p.inicio)}. ` +
    `Para cancelar ou remarcar: ${p.link}`
  );
}

export function msgAvaliacao(p: { nome: string; linkGoogle: string }) {
  return (
    `Olá, ${primeiroNome(p.nome)}! Obrigado por vir à ${NOME_BARBEARIA}. ` +
    `Se gostou do atendimento, sua avaliação no Google ajuda muito: ${p.linkGoogle}`
  );
}

export function msgRetorno(p: { nome: string; linkAgendar: string }) {
  return (
    `Olá, ${primeiroNome(p.nome)}! Faz um tempo que não te vemos na ${NOME_BARBEARIA}. ` +
    `Que tal agendar seu próximo horário? ${p.linkAgendar}`
  );
}

export const whatsappCom = (numero: string, texto: string) => linkWhatsapp(numero, texto);
