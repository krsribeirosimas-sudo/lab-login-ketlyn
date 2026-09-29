export const PROVIDERS = {
  google: {
    authorizeUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    issuer: "https://accounts.google.com",
  },
  github: {
    authorizeUrl: "https://github.com/login/oauth/authorize",
    tokenUrl: "https://github.com/login/oauth/access_token",
    issuer: "https://github.com",
  },
};

// Só aceita "google" ou "github". Qualquer outro nome devolve null.
export function getProvider(name) {
  return Object.hasOwn(PROVIDERS, name) ? PROVIDERS[name] : null;
}

// Busca o Client ID e o Client Secret certos nas variáveis do Cloudflare
export function getCredentials(name, env) {
  if (name === "google") {
    return {
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
    };
  }
  return {
    clientId: env.GITHUB_CLIENT_ID,
    clientSecret: env.GITHUB_CLIENT_SECRET,
  };
}

// Endereço de retorno exato de cada provedor
export function redirectUri(name, env) {
  return `${env.PUBLIC_BASE_URL}/oauth/callback/${name}`;
}
