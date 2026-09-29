import { getProvider, getCredentials, redirectUri } from "../../_shared/providers.js";
import { randomToken, sha256 } from "../../_shared/crypto.js";
import { getCookie, clearTxCookie, sessionCookie } from "../../_shared/cookies.js";
import { verifyGoogleIdToken } from "../../_shared/oidc.js";

const SESSION_SECONDS = 28800; // 8 horas
const GITHUB_API_VERSION = "2026-03-10";
const GITHUB_HEADERS = {
  Accept: "application/vnd.github+json",
  "X-GitHub-Api-Version": GITHUB_API_VERSION,
  "User-Agent": "oauth-pages-lab",
};

// Resposta de falha: simples, sem detalhes internos
function fail(status = 400) {
  const headers = new Headers({
    "Content-Type": "text/plain; charset=utf-8",
    "Cache-Control": "no-store",
  });
  headers.append("Set-Cookie", clearTxCookie());
  return new Response("Não foi possível concluir o login.", { status, headers });
}

// Troca o código pelas provas de identidade
async function exchangeCode(provider, name, env, code, codeVerifier) {
  const { clientId, clientSecret } = getCredentials(name, env);
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri(name, env),
    client_id: clientId,
    client_secret: clientSecret,
    code_verifier: codeVerifier,
  });
  const response = await fetch(provider.tokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body,
  });
  if (!response.ok) throw new Error("troca de código recusada");
  return response.json();
}

// Google: valida o id_token
async function identityFromGoogle(tokens, env, nonce) {
  const { clientId } = getCredentials("google", env);
  const claims = await verifyGoogleIdToken(tokens.id_token, { clientId, nonce });
  return {
    issuer: "https://accounts.google.com",
    subject: String(claims.sub),
    email: claims.email ?? null,
    displayName: claims.name ?? null,
  };
}

// GitHub: consulta o perfil e revoga a autorização
async function identityFromGithub(tokens, env) {
  const { clientId, clientSecret } = getCredentials("github", env);
  const accessToken = tokens.access_token;
  if (!accessToken || String(tokens.token_type).toLowerCase() !== "bearer") {
    throw new Error("resposta de token inválida");
  }

  const profileResponse = await fetch("https://api.github.com/user", {
    headers: { ...GITHUB_HEADERS, Authorization: `Bearer ${accessToken}` },
  });
  if (profileResponse.status !== 200) throw new Error("perfil recusado");
  const profile = await profileResponse.json();
  if (!Number.isInteger(profile.id)) throw new Error("identificador inválido");

  // Revoga a autorização; só continua se o GitHub responder 204
  const revokeResponse = await fetch(
    `https://api.github.com/applications/${clientId}/grant`,
    {
      method: "DELETE",
      headers: {
        ...GITHUB_HEADERS,
        Authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ access_token: accessToken }),
    }
  );
  if (revokeResponse.status !== 204) throw new Error("revogação falhou");

  return {
    issuer: "https://github.com",
    subject: String(profile.id), // id numérico, convertido em texto
    email: profile.email ?? null, // pode ser nulo
    displayName: profile.name || profile.login || null,
  };
}

export async function onRequestGet(context) {
  const { request, env, params } = context;
  const name = params.provider;

  const provider = getProvider(name);
  if (!provider) {
    return new Response("Not found", {
      status: 404,
      headers: { "Cache-Control": "no-store" },
    });
  }

  try {
    // 1. error, code e state
    const url = new URL(request.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    if (url.searchParams.has("error") || !code || !state) return fail();

    // 2. cookie temporário
    const transactionId = getCookie(request, "__Host-oauth-tx");
    if (!transactionId) return fail();

    // 3. transação existente e não expirada
    const now = Math.floor(Date.now() / 1000);
    const idHash = await sha256(transactionId);
    const transaction = await env.DB.prepare(
      "SELECT provider, state_hash, nonce, code_verifier FROM oauth_transactions WHERE id_hash = ?1 AND expires_at > ?2"
    )
      .bind(idHash, now)
      .first();
    if (!transaction || transaction.provider !== name) return fail();

    // 4. state confere?
    if (transaction.state_hash !== (await sha256(state))) return fail();

    // 5. apaga a transação ANTES de concluir (só vale uma vez)
    const deleted = await env.DB.prepare(
      "DELETE FROM oauth_transactions WHERE id_hash = ?1"
    )
      .bind(idHash)
      .run();
    if (deleted.meta.changes !== 1) return fail();

    // 6 e 7. troca o código e confirma a identidade
    const tokens = await exchangeCode(provider, name, env, code, transaction.code_verifier);
    const identity =
      name === "google"
        ? await identityFromGoogle(tokens, env, transaction.nonce)
        : await identityFromGithub(tokens, env);

    // 8. cria a sessão opaca (no banco fica só o resumo)
    const sessionToken = randomToken();
    await env.DB.prepare(
      "INSERT INTO sessions (id_hash, issuer, subject, email, display_name, expires_at, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)"
    )
      .bind(
        await sha256(sessionToken),
        identity.issuer,
        identity.subject,
        identity.email,
        identity.displayName,
        now + SESSION_SECONDS,
        now
      )
      .run();

    // 9 e 10. limpa o cookie temporário e volta para a página inicial
    const headers = new Headers({
      Location: `${env.PUBLIC_BASE_URL}/`,
      "Cache-Control": "no-store",
    });
    headers.append("Set-Cookie", sessionCookie(sessionToken));
    headers.append("Set-Cookie", clearTxCookie());
    return new Response(null, { status: 302, headers });
  } catch {
    return fail();
  }
}
