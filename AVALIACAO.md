# Avaliação: GitHub Actions com IA

Dupla: Ketlyn Ribeiro de Simas e Leonardo Ceratti dos Santos
Repositório: https://github.com/krsribeirosimas-sudo/lab-login-ketlyn

## Tarefa 1: CI a cada commit
- Execução verde: https://github.com/krsribeirosimas-sudo/lab-login-ketlyn/actions/runs/38006937623/job/114077778777
- Execução vermelha: https://github.com/krsribeirosimas-sudo/lab-login-ketlyn/actions/runs/38007295837/job/114078916148#step:4:9
- Linha do log com o erro: `Parse error near line 1: near "TABL": syntax error`
- Por que testar a migração em SQLite antes do D1: Testamos a migração no SQLite antes porque, se o SQL estiver errado, é melhor descobrir num banco de teste do que estragar o banco de verdade.

## Tarefa 2: main protegida
- PR bloqueado: https://github.com/krsribeirosimas-sudo/lab-login-ketlyn/pull/1
- PR liberado: https://github.com/krsribeirosimas-sudo/lab-login-ketlyn/pull/1
- Push direto recusado:

remote: - Changes must be made through a pull request.
remote: - Required status check "verificar" is expected.
To https://github.com/krsribeirosimas-sudo/lab-login-ketlyn.git
 ! [remote rejected] main -> main (push declined due to repository rule violations)
error: failed to push some refs to 'https://github.com/krsribeirosimas-sudo/lab-login-ketlyn.git'

## Tarefa 3: revisão por IA
- PR com os dois comentários da IA: https://github.com/krsribeirosimas-sudo/lab-login-ketlyn/pull/3
- Erro de permissão (sem pull-requests: write):

GraphQL: Resource not accessible by integration (addComment)
Error: Process completed with exit code 1.

- Execução com o erro: https://github.com/krsribeirosimas-sudo/lab-login-ketlyn/actions/runs/38500310291
- Crítica à IA: A IA disse que havia um "erro de lógica" porque PRs de forks não recebem o COPILOT_PAT. Isso é irrelevante: é uma proteção proposital do GitHub, e nossos PRs saem de branches do próprio repositório. Ela também deixou a resposta bagunçada, com opções de "Fix all issues" que não servem para um comentário.

## Tarefa 4: migrações
- Execução do merge (PR #5, que alterou migrations/): https://github.com/krsribeirosimas-sudo/lab-login-ketlyn/actions/runs/38503895393
- PR da migração: https://github.com/krsribeirosimas-sudo/lab-login-ketlyn/pull/5
- Saída do PRAGMA (Console do D1 no painel da Cloudflare):

> PRAGMA table_info(notas)
cid | name  | type    | notnull | dflt_value | pk
0   | id    | INTEGER | 0       | <null>     | 1
1   | aluno | TEXT    | 1       | <null>     | 0
2   | nota  | REAL    | 0       | <null>     | 0

> SELECT name FROM d1_migrations
name
0001_cria_tabelas.sql
0002_adiciona_coluna.sql

- A coluna nova é `nota REAL`, criada pela linha `ALTER TABLE notas ADD COLUMN nota REAL;` da migração 0002_adiciona_coluna.sql.
- Merge sem migrations/ (PR #4), em que o workflow migrar não rodou: https://github.com/krsribeirosimas-sudo/lab-login-ketlyn/pull/4
  Prova: na aba Actions não existe execução de "migrar" para o commit desse merge.

## Perguntas

1. O ci.yml tem dois gatilhos: push (qualquer ramificação) e pull_request para a main. Um único push numa ramificação com PR aberto dispara os dois, então aparecem duas execuções. As duas publicam o check "verificar" no último commit do PR, e a de pull_request é a mais relevante, porque testa o resultado da mescla com a main.

2. Workflows de pull_request vindos de forks rodam sem os segredos do repositório de destino. Isso impede que alguém abra um PR de um fork alterando o workflow para ler o segredo e enviá-lo para fora (com echo ou curl), roubando o token.

3. Declarar permissions aplica o menor privilégio: o workflow só recebe leitura do código e escrita em PRs, que é o que precisa para comentar. As permissões padrão podem ser mais amplas, e se o workflow for abusado, o estrago fica limitado.

4. Não. O status check é determinístico e bloqueia o merge quando falha. A IA é probabilística e o comentário dela não bloqueia nada. Na Tarefa 3 ela apontou como "erro de lógica" algo irrelevante (o caso dos forks) e ainda deixou a resposta confusa. Por isso ela complementa o CI, mas não o substitui.
