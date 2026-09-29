import { getProvider, getCredentials, redirectUri } from "../../_shared/providers.js";
import { randomToken, sha256 } from "../../_shared/crypto.js";
import { txCookie } from "../../_shared/cookies.js";

export async function onRequestGet(context) {
  const { env, params } = context;
  const name = params.provider;

  // Só google ou github. Qualquer outro nome é 404, sem detalhes.
  const provider = getProvider(name);
  if (!provider) {
    return new Response("Not found", {
      status: 404,
      headers: { "Cache-Control": "no-store" },
    });
  }

  const { clientId } = getCredentials(name, env);

  // Valores aleatórios da tentativa de login
  const transactionId = randomToken();
  const state = randomToken();
  const codeVerifier = randomToken();
  const nonce = name === "google" ? randomToken() : null; // só o Google usa nonce
  const codeChallenge = await sha256(codeVerifier);

  const now = Math.floor(Date.now() / 1000);
  const expiresAt = now + 600; // 10 minutos

  // Limpa transações antigas e grava a nova (só os resumos, nunca o cookie bruto)
  await env.DB.prepare("DELETE FROM oauth_transactions WHERE expires_at < ?1")
    .bind(now)
    .run();

  await env.DB.prepare(
    "INSERT INTO oauth_transactions (id_hash, provider, state_hash, nonce, code_verifier, expires_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6)"
  )
    .bind(
      await sha256(transactionId),
      name,
      await sha256(state),
      nonce,
      codeVerifier,
      expiresAt
    )
    .run();

  // Monta o pedido de autorização
  const url = new URL(provider.authorizeUrl);
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri(name, env));
  url.searchParams.set("response_type", "code");
  url.searchParams.set("state", state);
  url.searchParams.set("code_challenge", codeChallenge);
  url.searchParams.set("code_challenge_method", "S256");

  if (name === "google") {
    url.searchParams.set("scope", "openid email profile");
    url.searchParams.set("nonce", nonce);
  }
  // No GitHub: sem scope e sem nonce, como o roteiro pede.

  const headers = new Headers({
    Location: url.toString(),
    "Cache-Control": "no-store",
  });
  headers.append("Set-Cookie", txCookie(transactionId));

  return new Response(null, { status: 302, headers });
}
