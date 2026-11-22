# Hospedaê — publicação na Hostinger Premium Web Hosting

## Antes de publicar dados reais

1. Crie um projeto Supabase separado do alojamento Hostinger. Configure Auth e o domínio de redirecionamento; ative Google OAuth apenas se o quiser oferecer.
2. Aplique, **por ordem**, `supabase/migrations/001_schema.sql` até `013_reserved_slugs.sql`. Faça primeiro uma cópia da base de dados se já contiver dados; migrações com restrições podem falhar se existirem reservas sobrepostas.
3. Publique `ai-generate` (se a IA estiver ativa), `infinitepay-checkout` e `infinitepay-webhook` no Supabase. O webhook é público (`verify_jwt = false`); só deve confirmar pagamento após consultar a InfinitePay e validar o valor. Configure segredos nas funções, **nunca** em `VITE_*` nem no Git. Consulte o README para o mapeamento por pousada.
4. Configure num ficheiro `.env.production` local e privado a URL HTTPS do Supabase e a chave pública anon/publishable. Não envie este ficheiro para a Hostinger. Execute `npm ci --legacy-peer-deps`, `npm test`, `npm run test:deploy` e `npm run build:production`.
5. No gestor de ficheiros da Hostinger, envie **o conteúdo de `dist/`**, incluindo `.htaccess`, diretamente para `public_html/`. Não envie o código-fonte, `.env.production`, `node_modules` nem chaves privadas. Confirme HTTPS no domínio.
6. Abra `/`, `/login`, `/app` e o link público de uma pousada; atualize cada rota para verificar o fallback SPA. Num segundo navegador, confirme que o hóspede vê a pousada e que a reserva chega à conta do proprietário. Teste RLS com dois proprietários diferentes.
7. Teste uma cobrança real de baixo valor na conta InfinitePay da própria pousada e confira o estado com o extrato do prestador. **A InfinitePay não oferece sandbox.** Valide também cancelamento e procedimento manual de reembolso antes de ativar o link publicamente.

O comando `npm run build` mantém-se disponível para desenvolvimento/demonstração. **Use `npm run build:production` para publicar**: bloqueia o build se faltar a configuração pública do Supabase. É apenas uma verificação local; não prova que migrações, RLS, funções ou pagamentos tenham sido implementados no projeto remoto.

## Diagnóstico SQL antes do primeiro teste real

Depois de aplicar as treze migrações, execute `supabase/tests/production_checks.sql` no SQL Editor do **seu próprio** projeto Supabase. O script é apenas de leitura e falha se não encontrar RLS nas tabelas, se `anon` tiver acesso direto às tabelas, se funções públicas/privadas tiverem permissões indevidas, ou se faltarem restrições e triggers essenciais. **Não é uma prova de segurança completa:** teste no mínimo dois proprietários, um hóspede anónimo e as operações de leitura/escrita com sessões reais. Não desative RLS para fazer um teste passar.

## Teste de integração num projeto Supabase de ensaio

Depois das migrações `001`–`013` e do diagnóstico SQL, execute `npm run test:supabase` **apenas num projeto de ensaio descartável**. O comando fica bloqueado por defeito. Para o ativar, defina no terminal variáveis de ambiente privadas `RUN_SUPABASE_INTEGRATION=I_UNDERSTAND_THIS_CREATES_TEST_DATA`, `SUPABASE_TEST_URL`, `SUPABASE_TEST_ANON_KEY` (chave pública) e `SUPABASE_TEST_SERVICE_ROLE_KEY` (segredo **só no terminal/CI protegido**). Não coloque estas variáveis em ficheiros `VITE_*`, na Hostinger, no repositório ou nesta conversa. O ensaio cria duas contas de teste, verifica RLS, separação de quartos/tarifas, leitura pública filtrada, declaração de privacidade, cotação e conflito de reservas; tenta apagar as contas no fim. Se a limpeza falhar, apague manualmente os utilizadores com prefixo `hospedae-test-` na consola do projeto de ensaio. **Não execute em produção**: os testes criam e apagam dados e não validam pagamentos reais nem o webhook.
