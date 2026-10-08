/** Normaliza para só dígitos com DDI 55. Retorna null se não parecer um celular/fixo BR. */
export function normalizarWhatsapp(entrada: string): string | null {
  let d = entrada.replace(/\D/g, "");
  if (d.startsWith("55") && d.length >= 12) d = d.slice(2);
  if (d.length !== 10 && d.length !== 11) return null;
  return `55${d}`;
}

export function linkWhatsapp(numero: string, texto?: string): string {
  return `https://wa.me/${numero}${texto ? `?text=${encodeURIComponent(texto)}` : ""}`;
}

export function mascararWhatsapp(numero: string): string {
  const d = numero.startsWith("55") ? numero.slice(2) : numero;
  return d.length === 11
    ? `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
    : `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
}
