# Migração para PHP + MySQL — bloco 1

Este diretório **ainda não é um backend de produção**. Contém o esquema inicial e um endpoint de diagnóstico. A aplicação React continua a usar Supabase ou demonstração local; **não publique reservas reais**. Não misture este esquema com as migrações PostgreSQL em `supabase/`.

## Preparação na Hostinger

1. Crie uma base MySQL e um utilizador com acesso exclusivo a essa base no hPanel. O SQL em `sql/001_core.sql` requer MySQL 8 ou MariaDB 10.6+ com suporte efetivo a `CHECK`.
2. No servidor, coloque uma cópia de `private/config.example.php` como `config.php` **fora de `public_html`**, preenchendo as credenciais nesse ficheiro privado. Nunca carregue esse ficheiro para o Git ou para o ZIP público.
3. Só depois de preparar o backend completo, coloque `public/api/index.php` na pasta `public_html/edijalmemoura/hospedae/api/`. O endpoint `/api/index.php/health` devolve apenas o estado de ligação, sem expor credenciais. Em algumas configurações Apache, `PATH_INFO` não está disponível: validar no alojamento antes de publicar.

Ainda faltam autenticação com sessões protegidas, CRUD com isolamento por pousada, reserva pública e bloqueios transacionais, pagamentos e integração no frontend. A consulta de disponibilidade seguida de inserção **tem** de bloquear a linha do quarto (`SELECT ... FOR UPDATE`) numa transação InnoDB, verificando sobreposições de reservas e bloqueios antes de inserir; índices e `CHECK` por si só não impedem reservas simultâneas. Nenhuma migração foi executada numa base real neste ambiente.
