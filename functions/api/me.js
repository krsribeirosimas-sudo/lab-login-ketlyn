import { getCookie } from "../_shared/cookies.js";
import { sha256 } from "../_shared/crypto.js";

function respond(body, status) {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

export async function onRequestGet({ request, env }) {
  const token = getCookie(request, "__Host-session");
  if (!token) return respond({ error: "unauthorized" }, 401);

  const now = Math.floor(Date.now() / 1000);
  const session = await env.DB.prepare(
    "SELECT issuer, email, display_name FROM sessions WHERE id_hash = ?1 AND expires_at > ?2"
  )
    .bind(await sha256(token), now)
    .first();

  if (!session) return respond({ error: "unauthorized" }, 401);

  return respond(
    {
      provider: session.issuer === "https://github.com" ? "github" : "google",
      email: session.email,
      displayName: session.display_name,
    },
    200
  );
}
