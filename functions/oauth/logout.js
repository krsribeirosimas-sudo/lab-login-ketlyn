import { getCookie, clearSessionCookie } from "../_shared/cookies.js";
import { sha256 } from "../_shared/crypto.js";

export async function onRequestPost({ request, env }) {
  // Só aceita pedidos vindos exatamente do próprio site
  if (request.headers.get("Origin") !== env.PUBLIC_BASE_URL) {
    return new Response("Forbidden", {
      status: 403,
      headers: { "Cache-Control": "no-store" },
    });
  }

  
  const token = getCookie(request, "__Host-session");
  if (token) {
    await env.DB.prepare("DELETE FROM sessions WHERE id_hash = ?1")
      .bind(await sha256(token))
      .run();
  }


  const headers = new Headers({
    Location: `${env.PUBLIC_BASE_URL}/`,
    "Cache-Control": "no-store",
  });
  headers.append("Set-Cookie", clearSessionCookie());
  return new Response(null, { status: 303, headers });
}
