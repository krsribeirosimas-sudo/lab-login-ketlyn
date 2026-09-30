// Página de login: se já existe sessão, vai direto para o dashboard.
const status = document.getElementById("status");
const entrar = document.getElementById("entrar");

fetch("/api/me", { credentials: "same-origin" })
  .then((response) => (response.ok ? response.json() : null))
  .then((user) => {
    if (user) {
      status.textContent = `Sessão de ${user.email ?? user.displayName}. Abrindo o dashboard…`;
      window.location.replace("/dashboard.html");
    } else {
      status.textContent = "Nenhuma sessão neste navegador. Escolha como entrar:";
      entrar.hidden = false;
    }
  })
  .catch(() => {
    status.textContent = "Não foi possível consultar a sessão.";
    entrar.hidden = false;
  });
