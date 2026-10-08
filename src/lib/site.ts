/** URL pública do site (usada nos links enviados aos clientes). */
export function urlSite(): string {
  return (process.env.BETTER_AUTH_URL ?? "http://localhost:3000").replace(/\/$/, "");
}
