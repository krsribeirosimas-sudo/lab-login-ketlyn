const status = document.getElementById("status");
const entrar = document.getElementById("entrar");
const sair = document.getElementById("sair");

fetch("/api/me", { credentials: "same-origin" })
  .then((response) => (response.ok ? response.json() : null))
  .then((user) => {
    if (user) {
      status.textContent = `Sessão de ${user.email ?? user.displayName}.`;
      entrar.hidden = true;
      sair.hidden = false;
    } else {
      status.textContent = "Nenhuma sessão neste navegador.";
      entrar.hidden = false;
      sair.hidden = true;
    }
  })
  .catch(() => {
    status.textContent = "Não foi possível consultar a sessão.";
  });
