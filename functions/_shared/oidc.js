import { base64UrlToBytes, base64UrlToText } from "./crypto.js";

const ISSUER = "https://accounts.google.com";
const DISCOVERY_URL = `${ISSUER}/.well-known/openid-configuration`;
const CLOCK_SKEW = 60; // tolerância de 60 segundos no relógio

async function fetchJson(url) {
  const response = await fetch(url, { headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error("falha ao obter documento do emissor");
  return response.json();
}


export async function verifyGoogleIdToken(idToken, { clientId, nonce }) {
  // 1. O JWT precisa ter exatamente 3 partes separadas por ponto
  const parts = typeof idToken === "string" ? idToken.split(".") : [];
  if (parts.length !== 3 || parts.some((part) => !part)) {
    throw new Error("formato do token inválido");
  }
  const [encodedHeader, encodedPayload, encodedSignature] = parts;

  
  const header = JSON.parse(base64UrlToText(encodedHeader));
  if (header.alg !== "RS256" || !header.kid) {
    throw new Error("cabeçalho do token inválido");
  }

  
  const discovery = await fetchJson(DISCOVERY_URL);
  if (discovery.issuer !== ISSUER) throw new Error("emissor inesperado");

  
  const jwks = await fetchJson(discovery.jwks_uri);
  const jwk = (jwks.keys || []).find(
    (key) => key.kid === header.kid && key.kty === "RSA"
  );
  if (!jwk) throw new Error("chave pública não encontrada");

  
  const key = await crypto.subtle.importKey(
    "jwk",
    jwk,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["verify"]
  );

 
  const valid = await crypto.subtle.verify(
    "RSASSA-PKCS1-v1_5",
    key,
    base64UrlToBytes(encodedSignature),
    new TextEncoder().encode(`${encodedHeader}.${encodedPayload}`)
  );
  if (!valid) throw new Error("assinatura inválida");

  
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
