# Migração para PHP + MySQL — blocos iniciais

Este diretório **ainda não é um backend de produção**. Contém esquema, endpoints públicos e painel reduzido de contas, quartos e reservas; ainda não é um backend validado para produção. A aplicação React continua a usar Supabase ou demonstração local; **não publique reservas reais**. Não misture este esquema com as migrações PostgreSQL em `supabase/`.

## Preparação na Hostinger

1. Crie uma base MySQL e um utilizador com acesso exclusivo a essa base no hPanel. O SQL em `sql/001_core.sql` requer MySQL 8 ou MariaDB 10.6+ com suporte efetivo a `CHECK`.
2. No servidor, coloque uma cópia de `private/config.example.php` como `config.php` **fora de `public_html`**, preenchendo as credenciais nesse ficheiro privado. Nunca carregue esse ficheiro para o Git ou para o ZIP público.
3. Só depois de preparar o backend completo, coloque `public/api/index.php` na pasta `public_html/edijalmemoura/hospedae/api/`. O endpoint `/api/index.php?action=health` devolve apenas o estado de ligação, sem expor credenciais. As rotas `action=pousada`, `action=quartos` e `action=reservar` são **experimentais**: não devem ser publicadas sem autenticação, limites de taxa, política de privacidade e ensaio de concorrência no servidor.

Aplique todas as migrações 001–007 por ordem. O registo usa palavras-passe com `password_hash`, cookies Secure/HttpOnly/SameSite e tokens CSRF; requer HTTPS, `trusted_origin` e `cookie_path` corretos no ficheiro privado de configuração. A sessão é obtida com `GET ?action=session`; `POST ?action=register|login|logout` exige `Origin` correto e o token CSRF no cabeçalho `X-CSRF-Token`. O registo não dispõe ainda de verificação por e-mail nem recuperação de palavra-passe: não abrir o serviço ao público. A primeira implementação de reserva pública bloqueia o quarto (`SELECT ... FOR UPDATE`) antes de verificar conflitos. **Todas** as operações futuras de reserva e bloqueio, incluindo as manuais, devem usar a mesma disciplina de bloqueio. Ainda faltam testes de segurança e de sessão no PHP real, recuperação de conta, funcionalidades internas avançadas, tarifas sazonais e pagamentos; sem esses pontos não existe sistema real completo. As migrações e o ensaio sequencial passaram num MySQL 8.0 descartável da CI; não foram executados na Hostinger nem por HTTP.

## Operações internas experimentais

`GET ?action=my-rooms` e `GET ?action=my-bookings` exigem sessão e filtram pelo identificador de pousada obtido da conta autenticada, nunca pelo URL. `POST ?action=add-room` recebe `nome`, `capacidade` e `preco_base_centavos`; `POST ?action=add-booking` recebe dados do hóspede, datas, `quarto_id`, `adultos` e `metodo_pagamento`. Ambos exigem `Origin` e `X-CSRF-Token` da sessão. A reserva manual usa a mesma transação de bloqueio do quarto que a reserva pública e deixa `consentimento_em` vazio: não regista um consentimento que o hóspede não deu no formulário público. Os preços são sempre calculados no servidor. Ainda não existem operações de alteração/cancelamento nem bloqueios de calendário no backend PHP. **Não exponha estes endpoints na Hostinger antes de testar PHP, SQL, sessão, isolamento e concorrência com duas contas numa base descartável.**

## Calendário e cotação — ainda em ensaio

`GET ?action=my-blocks` lista apenas os bloqueios da sessão. `POST ?action=add-block` recebe `quarto_id`, `data_inicio`, `data_fim` (fim exclusivo) e `motivo`; usa `SELECT ... FOR UPDATE` no quarto antes de verificar sobreposições. `GET ?action=quote&slug=...&quarto_id=...&check_in=...&check_out=...&adultos=...` dá uma cotação informativa sem dados de hóspedes; o valor e a disponibilidade são recalculados ao criar a reserva. Neste primeiro esquema a tarifa é fixa por quarto, sem tarifário sazonal. A tabela de bloqueios não deve ser manipulada fora destes caminhos: outras escritas têm de usar a mesma disciplina transacional. Endpoints ainda não ligados ao frontend nem testados num MySQL real.

## Integração pública do frontend (fase experimental)

`VITE_BACKEND=php` no build faz a página pública usar o endpoint PHP **na mesma subpasta do site**; não envia pedidos a localhost nem guarda reservas em `localStorage`. Os quartos são apresentados sem descrição/fotografia até existir esse suporte no esquema MySQL. Com esta opção, a área interna fica intencionalmente indisponível: as contas PHP e as operações internas ainda não estão ligadas à interface. `npm run package:hostinger` continua a exigir Supabase; não há pacote de produção PHP nesta fase. Não use o ZIP de demonstração antigo nem publique uma versão com dados reais enquanto não houver fluxo interno e testes de ponta a ponta no alojamento.

## Painel PHP reduzido no frontend

No modo de build `VITE_BACKEND=php`, login, registo, consulta de sessão e saída usam a sessão PHP; o token CSRF é mantido apenas em memória. `/app` mostra só criação/listagem de quartos e reservas manuais/listagem; links de funcionalidades antigas não são exibidos. O nome introduzido no registo é o **nome da pousada**. A conta PHP ainda não tem confirmação de e-mail ou recuperação de palavra-passe; o painel já permite cancelar reservas e bloquear/remover datas, mas não alterar reservas. O pacote de produção PHP permanece indisponível até estas lacunas e o teste em MySQL real serem resolvidos.

## Cancelamentos e bloqueios — migração 004

Aplique `sql/004_cancellations.sql` **após** 001–003. `POST ?action=cancel-booking` recebe `id` e `motivo` (5–500 caracteres). Só cancela reservas pendentes/confirmadas da pousada da sessão; guarda motivo e data em vez de apagar. `POST ?action=remove-block` recebe `id` e marca o bloqueio como removido, mantendo o registo histórico. Ambas as operações verificam a pertença à pousada e bloqueiam o quarto na transação. Não há integração de cobrança ou reembolso: qualquer pagamento externo exige análise e ação manuais. A interface reduzida mostra estes controlos, mas **não execute a migração nem publique o painel em produção sem testes de sessão, concorrência e isolamento numa base descartável**.

## Limites de pedidos públicos

A tabela `auth_attempts` da migração 003 também limita pedidos por IP (`REMOTE_ADDR` do servidor, não cabeçalhos fornecidos pelo cliente): até 60 cotações e 6 tentativas de reserva em 15 minutos, além de limites de entrada/registo por IP e por combinação IP/e-mail. O servidor devolve HTTP 429 e `Retry-After` ao exceder um limite; um IP partilhado pode atingir o limite mais cedo. `POST ?action=reservar` exige `Origin` igual ao `trusted_origin` configurado. Isto reduz abuso, mas não substitui monitorização, HTTPS, mecanismos anti-bot ou testes de carga. A tabela acumula identificadores hash; planeie uma tarefa de limpeza periódica dos registos antigos no servidor. `npm run test:php:syntax` analisa os ficheiros PHP na CI, mas **não executa** o código PHP nem testa MySQL.

## Ensaio de integração numa base descartável

Após criar **uma base vazia de ensaio** cujo nome inclua o segmento `test`, aplique nela, por ordem, `sql/001_core.sql` a `sql/007_manual_payment.sql`. Numa máquina com PHP 8.2+ CLI, PDO MySQL e acesso a essa base, guarde um `config.php` privado **fora de `public_html`** (modelo em `private/config.example.php`). Corra:

```sh
RUN_PHP_INTEGRATION=I_UNDERSTAND_THIS_IS_A_DISPOSABLE_DATABASE \
HOSPEDAE_TEST_CONFIG_PATH=/caminho/privado/config.php \
php backend/tests/integration.php
```

O script recusa-se a correr sem confirmação, sem base com `test` no nome ou se já houver contas. Cria dados temporários para duas pousadas, verifica isolamento do catálogo, preço, consentimento, conflito e bloqueios; apaga-os num bloco `finally`. **Não execute na base de produção**. Este ensaio é sequencial: ainda faltam testes de pedidos HTTP com sessões e de concorrência real entre processos. A execução na CI passou no commit `8487441` ([Verificação](https://github.com/EdijalmeMoura/Pousada-Aldeia-dos-Camar-s/actions/runs/45071697307)); não foi executada neste sandbox nem na Hostinger. Nunca envie o ficheiro privado para o repositório nem o coloque na pasta pública do site.

## Ensaio HTTP (sessões e pedidos paralelos)

Use **outro domínio de ensaio independente** do domínio de produção, identificado por `test` ou `staging`, com HTTPS, PHP, migrações 001–007 aplicadas numa **base descartável** e `trusted_origin`/`cookie_path` privados corretos. O domínio `projetoredesnordeste.com.br` e os seus subdomínios estão explicitamente bloqueados neste teste. A partir de uma máquina com Node 20+:

```sh
RUN_PHP_HTTP_INTEGRATION=I_UNDERSTAND_THIS_CREATES_TEST_ACCOUNTS \
HOSPEDAE_TEST_BASE_URL=https://staging.exemplo.org/edijalmemoura/hospedae/ \
npm run test:php:http
```

O ensaio verifica cookies/sessão e CSRF, cria duas contas/quartos, tenta aceder ao quarto de outra pousada, lança **dois pedidos de reserva em paralelo** e espera apenas um sucesso, verifica reservas privadas e bloqueios. **Não apaga as contas**: elimine a base descartável após o ensaio. Não o execute no site nem na base reais. Mesmo com o ensaio aprovado, é necessária validação adicional de concorrência com múltiplos trabalhadores PHP, pagamentos, privacidade e recuperação de conta. `npm run test:php:http:guard` testa localmente as restrições de endereço; **nenhum pedido HTTP remoto foi executado neste ambiente**.

## Pacote de ensaio para Hostinger (não é produção)

Com `VITE_BASE_PATH=/test/ npm run package:php:staging`, o projeto gera `artifacts/hospedae-PHP-ENSAIO.zip`. Extraia-o somente na subpasta `/test/` de **um domínio de ensaio separado**, nunca no domínio real. O comando recusa a raiz e caminhos sem segmento final `/test/` ou `/staging/`, e impede a inclusão de variáveis Supabase no build. O ZIP inclui apenas frontend e `backend/public/api/*.php`, sem credenciais ou SQL; as migrações 001–007 e o ficheiro `config.php` privado são preparados separadamente. No servidor PHP, `HOSPEDAE_CONFIG_PATH` precisa de apontar para o caminho absoluto de `config.php` fora de `public_html`. Verifique se a sua configuração Hostinger permite definir essa variável de ambiente e se PHP 8.2+ com PDO MySQL está disponível. Não use esta versão com hóspedes reais. O ZIP local está ignorado pelo Git.

## Diagnóstico read-only da instalação de ensaio

Antes dos ensaios funcionais, no servidor de **testes**, corra `HOSPEDAE_TEST_CONFIG_PATH=/caminho/privado/config.php php backend/tests/diagnostic.php` por **PHP CLI**. O script verifica PHP 8.2+, extensões `pdo_mysql` e `mbstring`, configuração fora de `public_html`, base com `test` no nome, ligação, motor InnoDB, colunas das migrações 001–007, restrições `CHECK`, chaves estrangeiras e índices únicos. Não faz escrita nem mostra segredos. Um resultado «OK» **não** valida concorrência, sessões ou pagamentos. Nunca carregue `backend/tests/` para a pasta pública.

## Nome e link público no painel PHP

`POST ?action=update-pousada` recebe `nome` e `slug`, exige sessão, `Origin` e CSRF, atualiza apenas a pousada do proprietário e rejeita slugs reservados ou já usados. O slug é validado no servidor com 3–40 caracteres minúsculos, números ou hífen. O ensaio HTTP também verifica a rejeição de duplicados e a desativação do link antigo. **Alterar o link antigo pode quebrar reservas partilhadas:** avise os hóspedes antes de o mudar. Não há redirecionamento automático nem histórico de slugs nesta fase.

## Edição de quartos

`POST ?action=update-room` exige sessão/CSRF, `id`, `nome`, `capacidade`, `preco_base_centavos` e `ativo` booleano. O quarto é bloqueado em transação e só pode pertencer à pousada da sessão. A redução de capacidade é recusada se houver reservas pendentes/confirmadas que ainda não terminaram com mais hóspedes. Desativar retira-o do catálogo público e impede novas reservas, mas **não cancela** reservas existentes; alterar o preço afeta apenas novas cotações, não o valor já gravado. O ensaio HTTP cobre desativação/reativação e a recusa de redução de capacidade. Ainda falta testá-lo num MySQL real.

## Palavra-passe e revogação de sessões — migração 005

Aplique `sql/005_session_version.sql` depois de 001–004 **antes** de publicar o PHP atualizado. O painel permite mudar a palavra-passe com a atual e uma nova de 12–256 caracteres. O servidor guarda apenas `password_hash`, roda o ID da sessão e incrementa `session_version`: outros navegadores ficam sem acesso; sessões criadas antes desta migração precisam de novo login. O ensaio HTTP verifica a revogação e a recusa da palavra-passe antiga. Isto **não** é recuperação de conta: se perder a palavra-passe, ainda não existe um fluxo automático seguro de reposição. Não envie palavras-passe pela conversa nem as guarde no frontend.

## Confirmação operacional — migração 006

Aplique `sql/006_confirmation.sql` depois de 001–005. `POST ?action=confirm-booking` recebe o `id` da reserva, exige sessão/CSRF e só confirma uma reserva **pendente** da pousada da sessão cuja estadia ainda não terminou. Guarda `confirmada_em`, preserva o valor original e bloqueia o quarto durante a alteração. Uma segunda confirmação e pedidos de outra pousada são recusados; o ensaio HTTP cobre os dois casos. **Confirmar estadia não significa que o pagamento foi recebido**, nem envia mensagens ao hóspede. Sem integração de pagamento, combine e verifique cobranças fora do sistema.

## Contacto manual e exportação no painel PHP

A lista de reservas mostra o contacto do hóspede e, apenas após confirmar a estadia, permite **preparar** uma mensagem no e-mail ou WhatsApp do operador. Nada é enviado automaticamente e a mensagem diz explicitamente que o pagamento não foi verificado na plataforma. O botão CSV exporta as reservas carregadas no navegador, incluindo dados pessoais; as células são protegidas contra fórmulas de folhas de cálculo. Proteja o ficheiro descarregado e partilhe-o apenas com pessoas autorizadas. Não existe ainda registo de envio no servidor, nem prova de entrega da mensagem.

## Resumo operacional (sem pagamentos)

`GET ?action=my-summary` exige sessão e devolve apenas contagens e valor agregado da **pousada autenticada**: reservas pendentes, confirmadas, chegadas do dia e valor reservado dessas duas categorias. Não apresenta hóspedes nem valores de outras pousadas. **Valor reservado não é dinheiro recebido**; não use o número como faturação. «Hoje» segue `CURRENT_DATE()` do MySQL: confirme o fuso horário configurado na ligação antes de usar esta métrica. O ensaio HTTP verifica o isolamento e a passagem de pendente a confirmada.

## Fuso horário da pousada

O ficheiro privado `config.php` precisa agora de `php_timezone` e `mysql_time_offset`, como no exemplo (`America/Recife` e `-03:00`). O backend recusa pedidos se faltarem ou se os dois fusos não coincidirem no momento atual; define o fuso da ligação MySQL antes de avaliar `CURRENT_DATE()` ou `NOW()`. Isto alinha a validação de datas, a aceitação de privacidade e «chegadas hoje». O diagnóstico de ensaio confirma a configuração. **Esta versão usa um único fuso por instalação**, não um fuso por pousada; se houver pousadas noutras regiões do Brasil, será necessário guardar e aplicar o fuso de cada pousada antes de disponibilizar a plataforma a todas. Não altere o fuso de uma base com dados reais sem planear o impacto nos horários já registados.

## Data local na reserva pública

`GET ?action=pousada` devolve também `today` no fuso configurado para a instalação. O frontend PHP utiliza esta data no calendário e na sua validação prévia, em vez da data UTC do navegador. O servidor continua a recalcular datas e disponibilidade no momento da cotação e da criação; uma página aberta durante a mudança de dia pode ficar com a data anterior e o servidor rejeitará datas expiradas. No modo multi-fuso, será necessário definir o fuso por pousada.

## Cobrança manual privada — migração 007

Aplique `sql/007_manual_payment.sql` após 001–006. `GET ?action=my-payment-settings` e `POST ?action=update-payment-settings` consultam/guardam **apenas para a pousada da sessão** uma chave PIX opcional e um link HTTPS opcional. O servidor recusa links HTTP, com credenciais no URL, IPs ou destinos `.local`/`.internal`. Estes campos **não são segredos de API** nem são devolvidos pela reserva pública. Não há checkout InfinitePay, cobrança automática ou prova de pagamento: cada pousada deve confirmar qualquer pagamento pelos seus próprios canais e nunca marcar «pago» por mera criação da reserva. O ensaio HTTP verifica o isolamento e a rejeição de links inseguros.

## Mensagens de cobrança manual e isolamento de sessão

Após guardar os dados PIX/link privados, a lista de reservas permite preparar instruções por e-mail ou WhatsApp apenas para reservas pendentes ou confirmadas. O operador revê e envia manualmente; nenhum botão cria checkout, cobra dinheiro ou altera o estado do pagamento. O texto usa os dados da **pousada autenticada**, não os de outras contas. Ao entrar, criar outra conta, sair ou receber HTTP 401, o frontend apaga a cache de consultas (incluindo reservas e dados de cobrança) para evitar mostrar dados antigos de outra pousada no mesmo navegador. O ensaio PHP/MySQL remoto ainda é obrigatório antes de usar dados reais.

## Comunicação honesta no modo PHP

A página inicial e o ecrã de acesso do build `VITE_BACKEND=php` mostram apenas capacidades do painel reduzido e identificam a instalação como ensaio. A página de privacidade e os termos deixam de afirmar que o PHP usa RLS, que cobra subscrições ou que dispõe de check-in IA; os textos são **informação provisória**, não uma política/contrato aprovado para operação real. Antes de receber hóspedes reais, a entidade responsável deve rever finalidade, conservação, pedidos LGPD, contactos válidos, pagamentos e termos com apoio jurídico adequado. Nunca anuncie cobrança automática que não foi integrada e testada.

## Guarda de ensaio contra publicação acidental

O PHP deste repositório **não tem modo de produção**. Antes de ligar ao MySQL, cada pedido exige `environment = staging`, base com segmento `test`, origem HTTPS num domínio separado de `projetoredesnordeste.com.br`, `HTTP_HOST` correspondente e `cookie_path` igual à subpasta `/test/` ou `/staging/` onde o endpoint está instalado. O exemplo privado foi atualizado para um domínio/base de ensaio. Se colocar o ZIP no site real ou o ligar à base real, o endpoint deve responder HTTP 503 sem criar contas/reservas. `backend/tests/staging_guard.php` é um teste de guarda por PHP CLI **sem base**; continua a não ter sido executado aqui, pois falta PHP. A barreira é adicional, não substitui isolamento de credenciais, HTTPS ou revisão antes de produção.

## Execução PHP real na CI (sem MySQL)

A CI instala PHP CLI e `mbstring`, executa `php -l` nos ficheiros PHP públicos e de teste e corre `backend/tests/staging_guard.php` e `backend/tests/validation.php`. Estes testes exercitam em PHP a proteção do domínio de ensaio, datas, formato da reserva e consentimento, **sem acesso à base**. Não cobrem SQL, PHP-FPM/Apache, sessões HTTP, concorrência, pagamentos ou a Hostinger. O resultado da execução remota da CI deve ser confirmado no GitHub; análise sintática local por JavaScript continua a ser apenas análise estática.

## MySQL efémero na CI

A CI inicia um serviço MySQL 8.0 **descartável**, com credenciais exclusivamente de teste definidas no próprio workflow, aplica as migrações 001–007, corre o diagnóstico e `backend/tests/integration.php` com duas pousadas. A configuração temporária fica fora de `public_html` e é removida no fim do passo. Não há ligação a nenhuma base da Hostinger nem reutilização destas credenciais no produto. A execução da CI do commit `8487441` [terminou com sucesso](https://github.com/EdijalmeMoura/Pousada-Aldeia-dos-Camar-s/actions/runs/45071697307). Este ensaio não exercita HTTP/cookies, múltiplos trabalhadores PHP, MariaDB da Hostinger ou pagamentos; as etapas no domínio de ensaio continuam obrigatórias.

## Concorrência na CI

`backend/tests/concurrency.php` usa a mesma base descartável da CI e dois processos PHP, um a criar uma reserva pública e outro uma reserva manual para o mesmo quarto e datas. O processo principal segura inicialmente o bloqueio InnoDB do quarto enquanto ambos os trabalhadores anunciam que vão tentar reservar; verifica depois que existe exactamente uma reserva, com um sucesso e um conflito. Não requer privilégios de observação das transações. Não execute este ensaio na base de produção. Este teste não substitui pedidos HTTP reais, nem demonstra o comportamento do MariaDB/Apache na Hostinger.
