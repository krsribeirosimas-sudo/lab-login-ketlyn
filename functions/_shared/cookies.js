export function getCookie(request, name) {
  const header = request.headers.get("Cookie") || "";
  for (const part of header.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return rest.join("=");
  }
  return null;
}

export function txCookie(value) {
  return `__Host-oauth-tx=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=600`;
}

export function clearTxCookie() {
  return "__Host-oauth-tx=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0";
}

export function sessionCookie(value) {
  return `__Host-session=${value}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=28800`;
}

export function clearSessionCookie() {
  return "__Host-session=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0";
}
