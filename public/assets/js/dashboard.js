const $ = (id) => document.getElementById(id);
const titulos = { painel: "Painel", perfil: "Perfil", seguranca: "Segurança" };
const nomesProvedor = { google: "Google", github: "GitHub" };


function mostrarSecao() {
  const id = titulos[location.hash.slice(1)] ? location.hash.slice(1) : "painel";
  document.querySelectorAll(".secao").forEach((s) => (s.hidden = s.id !== id));
  document.querySelectorAll(".sidebar nav a").forEach((a) =>
    a.classList.toggle("ativo", a.dataset.sec === id)
  );
  $("titulo").textContent = titulos[id];
  $("sidebar").classList.remove("aberta");
}
window.addEventListener("hashchange", mostrarSecao);
$("menu").addEventListener("click", () => $("sidebar").classList.toggle("aberta"));
mostrarSecao();


function desenharGrafico(chart) {
  const ns = "http://www.w3.org/2000/svg";
  const W = 560, H = 220, base = 190, topo = 20;
  const max = Math.max(...chart.values);
  const larg = W / chart.values.length;

  const svg = document.createElementNS(ns, "svg");
  svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
  svg.setAttribute("role", "img");
  svg.setAttribute("aria-label", chart.title);

  chart.values.forEach((v, i) => {
    const altura = (v / max) * (base - topo);
    const x = i * larg + larg * 0.2;
    const rect = document.createElementNS(ns, "rect");
    rect.setAttribute("x", x);
    rect.setAttribute("y", base - altura);
    rect.setAttribute("width", larg * 0.6);
    rect.setAttribute("height", altura);
    rect.setAttribute("rx", 3);
    rect.setAttribute("fill", "#1dc7ea");
    svg.appendChild(rect);

    const valor = document.createElementNS(ns, "text");
    valor.setAttribute("x", x + larg * 0.3);
    valor.setAttribute("y", base - altura - 6);
    valor.setAttribute("text-anchor", "middle");
    valor.setAttribute("class", "svg-valor");
    valor.textContent = v;
    svg.appendChild(valor);

    const rotulo = document.createElementNS(ns, "text");
    rotulo.setAttribute("x", x + larg * 0.3);
    rotulo.setAttribute("y", base + 20);
    rotulo.setAttribute("text-anchor", "middle");
    rotulo.setAttribute("class", "svg-rotulo");
    rotulo.textContent = chart.labels[i];
    svg.appendChild(rotulo);
  });

  $("grafico").replaceChildren(svg);
}


function preencher(d) {
  const u = d.user;
  const nome = u.displayName || u.email || "Usuária";
  $("nome").textContent = nome;

  // Perfil
  $("avatar").textContent = nome.trim().charAt(0).toUpperCase();
  $("p-nome").textContent = u.displayName || "—";
  $("p-email").textContent = u.email || "não informado (o GitHub não expõe e-mail neste laboratório)";
  $("p-provedor").textContent = nomesProvedor[u.provider] || u.provider;
  $("p-expira").textContent = new Date(d.sessionExpiresAt * 1000).toLocaleString("pt-BR");

  
  $("stats").replaceChildren(
    ...d.stats.map((s) => {
      const card = document.createElement("article");
      card.className = `cartao stat ${s.cor}`;
      const rotulo = document.createElement("span");
      rotulo.className = "rotulo";
      rotulo.textContent = s.label;
      const valor = document.createElement("strong");
      valor.textContent = s.value;
      const nota = document.createElement("small");
      nota.textContent = s.note;
      card.append(rotulo, valor, nota);
      return card;
    })
  );

  
  $("grafico-titulo").textContent = d.chart.title;
  desenharGrafico(d.chart);

  
  $("atividade").replaceChildren(
    ...d.activity.map((a) => {
      const li = document.createElement("li");
      const quando = document.createElement("time");
      quando.textContent = a.quando;
      li.append(quando, " ", a.texto);
      return li;
    })
  );
}

fetch("/api/dashboard", { credentials: "same-origin" })
  .then((r) => {
    if (r.status === 401) {
      
      window.location.replace("/");
      return null;
    }
    if (!r.ok) throw new Error("falha");
    return r.json();
  })
  .then((d) => d && preencher(d))
  .catch(() => {
    $("erro").textContent = "Não foi possível carregar os dados do dashboard.";
    $("erro").hidden = false;
  });
