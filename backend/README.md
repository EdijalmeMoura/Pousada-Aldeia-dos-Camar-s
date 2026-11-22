# Migração para PHP + MySQL — blocos iniciais

Este diretório **ainda não é um backend de produção**. Contém o esquema inicial, endpoints públicos experimentais e uma primeira implementação de contas com sessão. A aplicação React continua a usar Supabase ou demonstração local; **não publique reservas reais**. Não misture este esquema com as migrações PostgreSQL em `supabase/`.

## Preparação na Hostinger

1. Crie uma base MySQL e um utilizador com acesso exclusivo a essa base no hPanel. O SQL em `sql/001_core.sql` requer MySQL 8 ou MariaDB 10.6+ com suporte efetivo a `CHECK`.
2. No servidor, coloque uma cópia de `private/config.example.php` como `config.php` **fora de `public_html`**, preenchendo as credenciais nesse ficheiro privado. Nunca carregue esse ficheiro para o Git ou para o ZIP público.
3. Só depois de preparar o backend completo, coloque `public/api/index.php` na pasta `public_html/edijalmemoura/hospedae/api/`. O endpoint `/api/index.php?action=health` devolve apenas o estado de ligação, sem expor credenciais. As rotas `action=pousada`, `action=quartos` e `action=reservar` são **experimentais**: não devem ser publicadas sem autenticação, limites de taxa, política de privacidade e ensaio de concorrência no servidor.

Aplique `sql/002_booking_code.sql` e `sql/003_auth_rate_limit.sql` após 001. O registo usa palavras-passe com `password_hash`, cookies Secure/HttpOnly/SameSite e tokens CSRF; requer HTTPS, `trusted_origin` e `cookie_path` corretos no ficheiro privado de configuração. A sessão é obtida com `GET ?action=session`; `POST ?action=register|login|logout` exige `Origin` correto e o token CSRF no cabeçalho `X-CSRF-Token`. O registo não dispõe ainda de verificação por e-mail nem recuperação de palavra-passe: não abrir o serviço ao público. A primeira implementação de reserva pública bloqueia o quarto (`SELECT ... FOR UPDATE`) antes de verificar conflitos. **Todas** as operações futuras de reserva e bloqueio, incluindo as manuais, devem usar a mesma disciplina de bloqueio. Ainda faltam testes de segurança e de sessão no PHP real, recuperação de conta, CRUD com isolamento por pousada, tarifas, pagamentos e integração no frontend; sem esses pontos não existe sistema real completo. Nenhuma migração ou endpoint PHP foi executado numa base real neste ambiente.

## Operações internas experimentais

`GET ?action=my-rooms` e `GET ?action=my-bookings` exigem sessão e filtram pelo identificador de pousada obtido da conta autenticada, nunca pelo URL. `POST ?action=add-room` recebe `nome`, `capacidade` e `preco_base_centavos`; `POST ?action=add-booking` recebe dados do hóspede, datas, `quarto_id`, `adultos` e `metodo_pagamento`. Ambos exigem `Origin` e `X-CSRF-Token` da sessão. A reserva manual usa a mesma transação de bloqueio do quarto que a reserva pública e deixa `consentimento_em` vazio: não regista um consentimento que o hóspede não deu no formulário público. Os preços são sempre calculados no servidor. Ainda não existem operações de alteração/cancelamento nem bloqueios de calendário no backend PHP. **Não exponha estes endpoints na Hostinger antes de testar PHP, SQL, sessão, isolamento e concorrência com duas contas numa base descartável.**

## Calendário e cotação — ainda em ensaio

`GET ?action=my-blocks` lista apenas os bloqueios da sessão. `POST ?action=add-block` recebe `quarto_id`, `data_inicio`, `data_fim` (fim exclusivo) e `motivo`; usa `SELECT ... FOR UPDATE` no quarto antes de verificar sobreposições. `GET ?action=quote&slug=...&quarto_id=...&check_in=...&check_out=...&adultos=...` dá uma cotação informativa sem dados de hóspedes; o valor e a disponibilidade são recalculados ao criar a reserva. Neste primeiro esquema a tarifa é fixa por quarto, sem tarifário sazonal. A tabela de bloqueios não deve ser manipulada fora destes caminhos: outras escritas têm de usar a mesma disciplina transacional. Endpoints ainda não ligados ao frontend nem testados num MySQL real.

## Integração pública do frontend (fase experimental)

`VITE_BACKEND=php` no build faz a página pública usar o endpoint PHP **na mesma subpasta do site**; não envia pedidos a localhost nem guarda reservas em `localStorage`. Os quartos são apresentados sem descrição/fotografia até existir esse suporte no esquema MySQL. Com esta opção, a área interna fica intencionalmente indisponível: as contas PHP e as operações internas ainda não estão ligadas à interface. `npm run package:hostinger` continua a exigir Supabase; não há pacote de produção PHP nesta fase. Não use o ZIP de demonstração antigo nem publique uma versão com dados reais enquanto não houver fluxo interno e testes de ponta a ponta no alojamento.

## Painel PHP reduzido no frontend

No modo de build `VITE_BACKEND=php`, login, registo, consulta de sessão e saída usam a sessão PHP; o token CSRF é mantido apenas em memória. `/app` mostra só criação/listagem de quartos e reservas manuais/listagem; links de funcionalidades antigas não são exibidos. O nome introduzido no registo é o **nome da pousada**. A conta PHP ainda não tem confirmação de e-mail, recuperação de palavra-passe ou alterações/cancelamento de reservas. O pacote de produção PHP permanece indisponível até estas lacunas e o teste em MySQL real serem resolvidos.

## Cancelamentos e bloqueios — migração 004

Aplique `sql/004_cancellations.sql` **após** 001–003. `POST ?action=cancel-booking` recebe `id` e `motivo` (5–500 caracteres). Só cancela reservas pendentes/confirmadas da pousada da sessão; guarda motivo e data em vez de apagar. `POST ?action=remove-block` recebe `id` e marca o bloqueio como removido, mantendo o registo histórico. Ambas as operações verificam a pertença à pousada e bloqueiam o quarto na transação. Não há integração de cobrança ou reembolso: qualquer pagamento externo exige análise e ação manuais. A interface reduzida mostra estes controlos, mas **não execute a migração nem publique o painel em produção sem testes de sessão, concorrência e isolamento numa base descartável**.

## Limites de pedidos públicos

A tabela `auth_attempts` da migração 003 também limita pedidos por IP (`REMOTE_ADDR` do servidor, não cabeçalhos fornecidos pelo cliente): até 60 cotações e 6 tentativas de reserva em 15 minutos, além de limites de entrada/registo por IP e por combinação IP/e-mail. O servidor devolve HTTP 429 e `Retry-After` ao exceder um limite; um IP partilhado pode atingir o limite mais cedo. `POST ?action=reservar` exige `Origin` igual ao `trusted_origin` configurado. Isto reduz abuso, mas não substitui monitorização, HTTPS, mecanismos anti-bot ou testes de carga. A tabela acumula identificadores hash; planeie uma tarefa de limpeza periódica dos registos antigos no servidor. `npm run test:php:syntax` analisa os ficheiros PHP na CI, mas **não executa** o código PHP nem testa MySQL.

## Ensaio de integração numa base descartável

Após criar **uma base vazia de ensaio** cujo nome inclua o segmento `test`, aplique nela, por ordem, `sql/001_core.sql` a `sql/004_cancellations.sql`. Numa máquina com PHP 8.2+ CLI, PDO MySQL e acesso a essa base, guarde um `config.php` privado **fora de `public_html`** (modelo em `private/config.example.php`). Corra:

```sh
RUN_PHP_INTEGRATION=I_UNDERSTAND_THIS_IS_A_DISPOSABLE_DATABASE \
HOSPEDAE_TEST_CONFIG_PATH=/caminho/privado/config.php \
php backend/tests/integration.php
```

O script recusa-se a correr sem confirmação, sem base com `test` no nome ou se já houver contas. Cria dados temporários para duas pousadas, verifica isolamento do catálogo, preço, consentimento, conflito e bloqueios; apaga-os num bloco `finally`. **Não execute na base de produção**. Este ensaio é sequencial: ainda faltam testes de pedidos HTTP com sessões e de concorrência real entre processos. Este ambiente não tem PHP CLI/MySQL, pelo que o ensaio **não foi executado** aqui. Nunca envie o ficheiro privado para o repositório nem o coloque na pasta pública do site.

## Ensaio HTTP (sessões e pedidos paralelos)

Use **outro domínio de ensaio independente** do domínio de produção, identificado por `test` ou `staging`, com HTTPS, PHP, migrações 001–004 aplicadas numa **base descartável** e `trusted_origin`/`cookie_path` privados corretos. O domínio `projetoredesnordeste.com.br` e os seus subdomínios estão explicitamente bloqueados neste teste. A partir de uma máquina com Node 20+:

```sh
RUN_PHP_HTTP_INTEGRATION=I_UNDERSTAND_THIS_CREATES_TEST_ACCOUNTS \
HOSPEDAE_TEST_BASE_URL=https://staging.exemplo.org/edijalmemoura/hospedae/ \
npm run test:php:http
```

O ensaio verifica cookies/sessão e CSRF, cria duas contas/quartos, tenta aceder ao quarto de outra pousada, lança **dois pedidos de reserva em paralelo** e espera apenas um sucesso, verifica reservas privadas e bloqueios. **Não apaga as contas**: elimine a base descartável após o ensaio. Não o execute no site nem na base reais. Mesmo com o ensaio aprovado, é necessária validação adicional de concorrência com múltiplos trabalhadores PHP, pagamentos, privacidade e recuperação de conta. `npm run test:php:http:guard` testa localmente as restrições de endereço; **nenhum pedido HTTP remoto foi executado neste ambiente**.
