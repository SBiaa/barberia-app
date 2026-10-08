import { eq } from "drizzle-orm";
import { db } from "@/db";
import { configuracao } from "@/db/schema";

export async function linkAvaliacaoGoogle(): Promise<string | null> {
  const [r] = await db.select().from(configuracao).where(eq(configuracao.chave, "link_avaliacao_google"));
  return r?.valor ?? null;
}
