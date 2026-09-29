import { base64UrlToBytes, base64UrlToText } from "./crypto.js";

const ISSUER = "https://accounts.google.com";
const DISCOVERY_URL = `${ISSUER}/.well-known/openid-configuration`;
const CLOCK_SKEW = 60; // tolerância de 60 segundos no relógio

async function fetchJson(url) {
  const response = await fetch(url, { headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error("falha ao obter documento do emissor");
  return response.json();
}

// Confere o id_token do Google. Se algo estiver errado, lança um erro.
export async function verifyGoogleIdToken(idToken, { clientId, nonce }) {
  // 1. O JWT precisa ter exatamente 3 partes separadas por ponto
  const parts = typeof idToken === "string" ? idToken.split(".") : [];
  if (parts.length !== 3 || parts.some((part) => !part)) {
    throw new Error("formato do token inválido");
  }
  const [encodedHeader, encodedPayload, encodedSignature] = parts;

  // 2. O algoritmo tem que ser RS256
  const header = JSON.parse(base64UrlToText(encodedHeader));
  if (header.alg !== "RS256" || !header.kid) {
    throw new Error("cabeçalho do token inválido");
  }

  // 3. Documento de descoberta do emissor esperado
  const discovery = await fetchJson(DISCOVERY_URL);
  if (discovery.issuer !== ISSUER) throw new Error("emissor inesperado");

  // 4 e 5. Chaves públicas e escolha da chave pelo kid
  const jwks = await fetchJson(discovery.jwks_uri);
  const jwk = (jwks.keys || []).find(
    (key) => key.kid === header.kid && key.kty === "RSA"
  );
  if (!jwk) throw new Error("chave pública não encontrada");

  // 6. Importar a chave
  const key = await crypto.subtle.importKey(
    "jwk",
    jwk,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["verify"]
  );

  // 7. Verificar a assinatura
  const valid = await crypto.subtle.verify(
    "RSASSA-PKCS1-v1_5",
    key,
    base64UrlToBytes(encodedSignature),
    new TextEncoder().encode(`${encodedHeader}.${encodedPayload}`)
  );
  if (!valid) throw new Error("assinatura inválida");

  // 8. Conferir o conteúdo: iss, aud, exp, iat e nonce
  const claims = JSON.parse(base64UrlToText(encodedPayload));
  const now = Math.floor(Date.now() / 1000);

  if (claims.iss !== ISSUER) throw new Error("emissor inválido");

  const audiences = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
  if (!audiences.includes(clientId)) throw new Error("audiência inválida");

  if (typeof claims.exp !== "number" || claims.exp <= now - CLOCK_SKEW) {
    throw new Error("token expirado");
  }
  if (typeof claims.iat !== "number" || claims.iat > now + CLOCK_SKEW) {
    throw new Error("data de emissão inválida");
  }
  if (!nonce || claims.nonce !== nonce) throw new Error("nonce inválido");
  if (!claims.sub) throw new Error("identificador ausente");

  return claims; // só agora dá para usar sub, name e email
}
