"use client";

import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

export function Sair() {
  const router = useRouter();
  return (
    <button
      className="text-muted hover:text-silver"
      onClick={async () => {
        await authClient.signOut();
        router.replace("/entrar");
        router.refresh();
      }}
    >
      Sair
    </button>
  );
}
