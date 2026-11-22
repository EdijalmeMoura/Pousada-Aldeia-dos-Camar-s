# Ensaio da Hospedaê em PHP + MySQL na Hostinger

**Não instalar no site real `projetoredesnordeste.com.br/edijalmemoura/hospedae/`.** Este procedimento cria dados de teste e não valida pagamentos. Reserve um **domínio independente** com HTTPS e uma base MySQL descartável; um subdomínio do domínio real é recusado pelo ensaio HTTP por segurança.

## 1. Preparar ambiente separado

No hPanel da Hostinger, configure um domínio de ensaio separado com SSL ativo e uma base MySQL **vazia**, com `test` como segmento do nome (por exemplo `conta_test_hospedae`). Crie um utilizador MySQL limitado à base de ensaio. Antes de qualquer alteração, guarde uma cópia de segurança de outros sites do alojamento. Não crie estes dados na base de produção.

No phpMyAdmin **da base de ensaio**, execute, por ordem, `backend/sql/001_core.sql` a `backend/sql/006_confirmation.sql`. Pare se qualquer migração falhar; não avance com tabelas parcialmente instaladas. O SQL usa InnoDB, `CHECK` e chaves estrangeiras. Requer MySQL 8 ou MariaDB 10.6+.

## 2. Configuração privada

No servidor, crie `config.php` **fora de qualquer `public_html`**, a partir de `backend/private/config.example.php`. Preencha aí as credenciais da base de ensaio; ajuste `trusted_origin` para a origem HTTPS exata do domínio de ensaio (sem caminho ou barra final), `cookie_path` para `/test/`, `php_timezone` para `America/Recife` e `mysql_time_offset` para `-03:00` se a pousada estiver em Pernambuco. Não coloque o ficheiro no ZIP, no Git nem numa conversa.

Configure no servidor a variável `HOSPEDAE_CONFIG_PATH` para o **caminho absoluto** do ficheiro privado. Se o alojamento permitir `SetEnv` no `.htaccess` da pasta `/test/`, pode acrescentar manualmente uma linha `SetEnv HOSPEDAE_CONFIG_PATH /caminho/fora/public_html/config.php` **apenas no domínio de ensaio**. Isto indica um caminho, não contém a palavra-passe. Se a Hostinger não aceitar esta diretiva, peça ao suporte da hospedagem uma forma de definir a variável para PHP; **não mova `config.php` para a pasta pública**. O endpoint falha com HTTP 503 enquanto não estiver configurado.

## 3. Criar e instalar o ZIP de ensaio

Na cópia local do repositório, execute `VITE_BASE_PATH=/test/ npm run package:php:staging`. O ficheiro `artifacts/hospedae-PHP-ENSAIO.zip` contém só o frontend e `api/*.php`, não as migrações nem segredos. No Gestor de Ficheiros do **domínio de ensaio**, carregue o ZIP e extraia-o em `public_html/test/`, sem subpasta adicional. Confirme que `index.html`, `.htaccess`, `assets/`, `images/` e `api/index.php` ficam diretamente sob `/test/`.

Abra `https://DOMINIO-DE-ENSAIO/test/api/index.php?action=health` no navegador: deve devolver JSON `database_connected`. Se obtiver 503, pare e reveja PHP 8.2+, PDO MySQL, o caminho privado, os fusos e a ligação MySQL. Confirme também que `/test/login` abre após atualizar a página. **Não introduza hóspedes reais.**

## 4. Verificar antes de publicar

Se houver PHP CLI/SSH no ambiente de ensaio, execute o diagnóstico read-only e o ensaio sequencial conforme `backend/README.md`, sempre apontando para a base descartável. A partir de uma máquina com Node 20+, execute o ensaio HTTP protegido com `HOSPEDAE_TEST_BASE_URL=https://DOMINIO-DE-ENSAIO/test/`. Esse teste cria contas temporárias que **permanecem na base descartável**; elimine a base depois de rever os resultados. Teste também manualmente criação de conta, reserva anónima, confirmação/cancelamento e rotas após atualização do navegador.

**Não publique o ZIP de ensaio no domínio real.** Só se devem preparar migração e pacote de produção depois de validar sessões, isolamento, reservas concorrentes, privacidade, cópias de segurança, recuperação de conta e a estratégia de pagamentos (uma conta InfinitePay por pousada). Atualmente não há cobrança integrada em PHP.
