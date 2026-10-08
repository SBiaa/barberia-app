// Uso: npm run criar-dono -- "Nome" email@dominio.com
// A senha é lida da variável DONO_SENHA (não vai para o histórico do shell).
import { config } from "dotenv";
import { randomUUID } from "node:crypto";

config({ path: ".env.local" });

async function main() {
  const [nome, email] = process.argv.slice(2);
  const senha = process.env.DONO_SENHA;
  if (!nome || !email || !senha || senha.length < 8) {
    console.error('Uso: DONO_SENHA="(mín. 8 caracteres)" npm run criar-dono -- "Nome" email@dominio.com');
    process.exit(1);
  }
  const { auth } = await import("../src/lib/auth");
  const ctx = await auth.$context;
  const user = await ctx.internalAdapter.createUser({ name: nome, email, emailVerified: true } as never, undefined as never);
  await ctx.internalAdapter.linkAccount({
    id: randomUUID(),
    userId: user.id,
    accountId: user.id,
    providerId: "credential",
    password: await ctx.password.hash(senha),
  });
  console.log(`Usuário criado: ${email}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
