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


export function getProvider(name) {
  return Object.hasOwn(PROVIDERS, name) ? PROVIDERS[name] : null;
}


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


export function redirectUri(name, env) {
  return `${env.PUBLIC_BASE_URL}/oauth/callback/${name}`;
}
