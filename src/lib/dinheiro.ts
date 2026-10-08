/** Centavos (inteiro) → "R$ 35,00". */
export function formatarReais(centavos: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    centavos / 100,
  );
}

/** "35", "35,5", "1.234,50" → centavos inteiros; null se inválido. */
export function reaisParaCentavos(texto: string): number | null {
  const limpo = texto.trim().replace(/[R$\s]/g, "").replace(/\./g, "").replace(",", ".");
  if (!/^\d+(\.\d{1,2})?$/.test(limpo)) return null;
  const [inteiro, frac = ""] = limpo.split(".");
  return Number(inteiro) * 100 + Number(frac.padEnd(2, "0"));
}
