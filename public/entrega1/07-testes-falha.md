# Testes de falha

## Caso 1: retorno sem cookie temporário
- **Preparação:** iniciei o login com GitHub em uma janela comum e parei na página de autorização. Copiei a URL de autorização para uma janela privativa, que não tinha o cookie `__Host-oauth-tx`, e conclui o login nela.
- **Pedido enviado:** `GET /oauth/callback/github` sem o cookie `__Host-oauth-tx`.
- **Resultado esperado:** a rota de retorno recusa a resposta e não cria sessão.
- **Resultado observado:** a rota respondeu "Não foi possível concluir o login.".

## Caso 2: state alterado
- **Preparação:** iniciei o login com GitHub e parei na página de autorização. Alterei um único caractere do parâmetro `state` na barra de endereço e prossegui.
- **Pedido enviado:** `GET /oauth/callback/github` com um `state` diferente do registrado no banco.
- **Resultado esperado:** a rota de retorno recusa a resposta antes de trocar o código.
- **Resultado observado:** a rota respondeu "Não foi possível concluir o login.".

## Caso 3: reutilização da transação
- **Preparação:** concluí um login com Google e, pelo painel Rede das ferramentas de desenvolvimento, copiei a URL da requisição de retorno. Abri essa URL novamente em uma aba nova.
- **Pedido enviado:** `GET /oauth/callback/google` com o mesmo `code` e o mesmo `state` já utilizados.
- **Resultado esperado:** a repetição falha, porque a transação já foi removida.
- **Resultado observado:** a rota respondeu "Não foi possível concluir o login." e a sessão original continuou ativa.

## Caso 4: sessão expirada
- **Preparação:** com uma sessão criada, executei `UPDATE sessions SET expires_at = 0;` no console do D1 e recarreguei a página.
- **Pedido enviado:** `GET /api/me` com o cookie de sessão ainda presente no navegador.
- **Resultado esperado:** resposta 401.
- **Resultado observado:** a rota respondeu 401 com `{"error":"unauthorized"}`.

## Caso 5: origem inválida na saída
- **Preparação:** com uma sessão válida aberta em `https://lab-login-ketlyn.pages.dev`, abri `https://example.com` e executei no console um `fetch` com método POST e `credentials: "include"` para `/oauth/logout`.
- **Pedido enviado:** `POST /oauth/logout` com o cabeçalho `Origin` de `https://example.com`.
- **Resultado esperado:** a rota recusa a operação e a sessão original permanece válida.
- **Resultado observado:** o servidor respondeu 403 (Forbidden) e o navegador registrou erro de CORS. Ao voltar à aba do site, a sessão original continuou válida.

## Caso 6: reutilização do cookie revogado
- **Preparação:** em uma sessão exclusiva do laboratório, copiei temporariamente o valor do cookie `__Host-session` pelas ferramentas de desenvolvimento, executei o logout e restaurei o mesmo valor. Depois apaguei a cópia.
- **Pedido enviado:** `GET /api/me` com o cookie restaurado.
- **Resultado esperado:** resposta 401, porque a linha da sessão foi removida do D1.
- **Resultado observado:** a rota respondeu 401 com `{"error":"unauthorized"}`.
