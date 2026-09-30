import { getCookie } from "../_shared/cookies.js";
import { sha256 } from "../_shared/crypto.js";

function respond(body, status) {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

// Dados do dashboard: só são entregues com uma sessão válida.
// (A página dashboard.html é pública; os dados abaixo, não.)
export async function onRequestGet({ request, env }) {
  const token = getCookie(request, "__Host-session");
  if (!token) return respond({ error: "unauthorized" }, 401);

  const now = Math.floor(Date.now() / 1000);
  const session = await env.DB.prepare(
    "SELECT issuer, email, display_name, expires_at FROM sessions WHERE id_hash = ?1 AND expires_at > ?2"
  )
    .bind(await sha256(token), now)
    .first();

  if (!session) return respond({ error: "unauthorized" }, 401);

  return respond(
    {
      user: {
        provider: session.issuer === "https://github.com" ? "github" : "google",
        email: session.email,
        displayName: session.display_name,
      },
      sessionExpiresAt: session.expires_at,
      // Dados de exemplo (fictícios) para preencher o painel
      stats: [
        { label: "Visitas hoje", value: "1.284", note: "+12% em relação a ontem", cor: "azul" },
        { label: "Pedidos", value: "342", note: "+5% na semana", cor: "verde" },
        { label: "Receita", value: "R$ 18,4 mil", note: "meta: R$ 25 mil", cor: "laranja" },
        { label: "Chamados abertos", value: "7", note: "2 urgentes", cor: "vermelho" },
      ],
      chart: {
        title: "Pedidos por mês",
        labels: ["Abr", "Mai", "Jun", "Jul", "Ago", "Set"],
        values: [180, 240, 210, 290, 330, 342],
      },
      activity: [
        { quando: "há 5 min", texto: "Novo pedido #1042 recebido" },
        { quando: "há 32 min", texto: "Chamado #88 marcado como urgente" },
        { quando: "há 2 h", texto: "Relatório semanal gerado" },
        { quando: "ontem", texto: "Meta de visitas atingida" },
      ],
    },
    200
  );
}
