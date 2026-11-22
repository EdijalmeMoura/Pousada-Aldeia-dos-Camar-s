# Migração para PHP + MySQL — bloco 1

Este diretório **ainda não é um backend de produção**. Contém o esquema inicial e um endpoint de diagnóstico. A aplicação React continua a usar Supabase ou demonstração local; **não publique reservas reais**. Não misture este esquema com as migrações PostgreSQL em `supabase/`.

## Preparação na Hostinger

1. Crie uma base MySQL e um utilizador com acesso exclusivo a essa base no hPanel. O SQL em `sql/001_core.sql` requer MySQL 8 ou MariaDB 10.6+ com suporte efetivo a `CHECK`.
2. No servidor, coloque uma cópia de `private/config.example.php` como `config.php` **fora de `public_html`**, preenchendo as credenciais nesse ficheiro privado. Nunca carregue esse ficheiro para o Git ou para o ZIP público.
3. Só depois de preparar o backend completo, coloque `public/api/index.php` na pasta `public_html/edijalmemoura/hospedae/api/`. O endpoint `/api/index.php?action=health` devolve apenas o estado de ligação, sem expor credenciais. As rotas `action=pousada`, `action=quartos` e `action=reservar` são **experimentais**: não devem ser publicadas sem autenticação, limites de taxa, política de privacidade e ensaio de concorrência no servidor.

Aplique também `sql/002_booking_code.sql` após 001. A primeira implementação de reserva pública bloqueia o quarto (`SELECT ... FOR UPDATE`) antes de verificar conflitos. **Todas** as operações futuras de reserva e bloqueio, incluindo as manuais, devem usar a mesma disciplina de bloqueio. Ainda faltam autenticação com sessões protegidas, CRUD com isolamento por pousada, tarifas, pagamentos e integração no frontend; sem esses pontos não existe sistema real completo. Nenhuma migração ou endpoint PHP foi executado numa base real neste ambiente.
