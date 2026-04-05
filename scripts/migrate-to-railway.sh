#!/bin/bash
# migrate-to-railway.sh — Migra o banco de produção (Render) para o Railway
#
# Uso:
#   ./scripts/migrate-to-railway.sh
#
# Pré-requisitos:
#   1. PROD_DB_URL definida no ~/.zshrc (banco Render atual)
#   2. RAILWAY_DB_URL definida no ~/.zshrc (banco Railway novo)
#      → Railway: projeto → serviço Postgres → Variables → DATABASE_PUBLIC_URL
#
# Adicione ao ~/.zshrc antes de rodar:
#   export PROD_DB_URL="postgresql://..."
#   export RAILWAY_DB_URL="postgresql://..."

set -e

# ── Cores ────────────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; BOLD='\033[1m'; NC='\033[0m'

info()    { echo -e "${BLUE}▶  $*${NC}"; }
success() { echo -e "${GREEN}✅  $*${NC}"; }
warn()    { echo -e "${YELLOW}⚠️   $*${NC}"; }
error()   { echo -e "${RED}❌  $*${NC}"; exit 1; }

# ── Garantir libpq no PATH (macOS Homebrew) ──────────────────────────────────
export PATH="/opt/homebrew/opt/libpq/bin:$PATH"

echo ""
echo -e "${BOLD}╔══════════════════════════════════════════╗${NC}"
echo -e "${BOLD}║   LegalAI — Migração Render → Railway    ║${NC}"
echo -e "${BOLD}╚══════════════════════════════════════════╝${NC}"
echo ""

# ── Verificar variáveis ──────────────────────────────────────────────────────
[ -z "$PROD_DB_URL" ]    && error "PROD_DB_URL não definida. Adicione ao ~/.zshrc e rode: source ~/.zshrc"
[ -z "$RAILWAY_DB_URL" ] && error "RAILWAY_DB_URL não definida. Adicione ao ~/.zshrc e rode: source ~/.zshrc"

# ── Verificar ferramentas ─────────────────────────────────────────────────────
command -v pg_dump    &>/dev/null || error "pg_dump não encontrado. Instale: brew install libpq"
command -v pg_restore &>/dev/null || error "pg_restore não encontrado. Instale: brew install libpq"
command -v psql       &>/dev/null || error "psql não encontrado. Instale: brew install libpq"

# ── Confirmar ─────────────────────────────────────────────────────────────────
warn "Este script vai APAGAR todos os dados do banco Railway e restaurar com os dados do Render."
echo ""
read -p "  Continuar? (s/N) " -n 1 -r
echo ""
[[ ! $REPLY =~ ^[Ss]$ ]] && { warn "Cancelado."; exit 0; }
echo ""

DUMP_FILE="/tmp/legalai_render_$(date +%Y%m%d_%H%M%S).dump"

# ── 1. Dump do Render ─────────────────────────────────────────────────────────
info "[1/4] Exportando banco do Render..."
pg_dump "$PROD_DB_URL" \
  --no-owner \
  --no-acl \
  --no-privileges \
  -F c \
  -f "$DUMP_FILE"
DUMP_SIZE=$(du -sh "$DUMP_FILE" | cut -f1)
success "Dump concluído — $DUMP_FILE ($DUMP_SIZE)"
echo ""

# ── 2. Ativar extensões no Railway ────────────────────────────────────────────
info "[2/4] Ativando extensões no Railway (vector, uuid-ossp)..."
psql "$RAILWAY_DB_URL" \
  -c "CREATE EXTENSION IF NOT EXISTS vector;" \
  -c "CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";" \
  -c "CREATE EXTENSION IF NOT EXISTS pg_trgm;" \
  > /dev/null 2>&1 || warn "Algumas extensões já existem ou não estão disponíveis (normal)"
success "Extensões verificadas"
echo ""

# ── 3. Limpar schema do Railway ───────────────────────────────────────────────
info "[3/4] Preparando schema Railway para restauração..."
# Extrair usuário da URL para garantir permissões corretas
RAILWAY_USER=$(echo "$RAILWAY_DB_URL" | sed 's|postgresql://\([^:]*\):.*|\1|')
psql "$RAILWAY_DB_URL" \
  -c "DROP SCHEMA public CASCADE;" \
  -c "CREATE SCHEMA public;" \
  -c "GRANT ALL ON SCHEMA public TO \"$RAILWAY_USER\";" \
  -c "GRANT ALL ON SCHEMA public TO public;" \
  > /dev/null
success "Schema limpo e recriado"
echo ""

# ── 4. Restaurar no Railway ───────────────────────────────────────────────────
info "[4/4] Restaurando dados no Railway..."
pg_restore \
  --no-owner \
  --no-acl \
  --no-privileges \
  -d "$RAILWAY_DB_URL" \
  "$DUMP_FILE" || warn "pg_restore terminou com avisos (geralmente inofensivos — verifique abaixo)"
success "Restauração concluída"
echo ""

# ── Verificação rápida ────────────────────────────────────────────────────────
info "Verificando tabelas restauradas..."
TABLE_COUNT=$(psql "$RAILWAY_DB_URL" -t -c \
  "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" \
  | tr -d ' ')
USER_COUNT=$(psql "$RAILWAY_DB_URL" -t -c \
  "SELECT COUNT(*) FROM users;" 2>/dev/null | tr -d ' ' || echo "?")
DOC_COUNT=$(psql "$RAILWAY_DB_URL" -t -c \
  "SELECT COUNT(*) FROM jurisprudence_documents;" 2>/dev/null | tr -d ' ' || echo "?")

echo ""
echo -e "${BOLD}  Resultado da migração:${NC}"
echo "  • Tabelas restauradas : $TABLE_COUNT"
echo "  • Usuários            : $USER_COUNT"
echo "  • Documentos          : $DOC_COUNT"
echo ""

# ── Limpeza ───────────────────────────────────────────────────────────────────
rm -f "$DUMP_FILE"

echo -e "${GREEN}${BOLD}╔══════════════════════════════════════════╗${NC}"
echo -e "${GREEN}${BOLD}║   Migração concluída com sucesso! 🎉     ║${NC}"
echo -e "${GREEN}${BOLD}╚══════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BOLD}Próximos passos:${NC}"
echo "  1. Configure as variáveis de ambiente no Railway (API service)"
echo "  2. Atualize NEXT_PUBLIC_API_URL no Vercel com a URL do Railway"
echo "  3. Atualize CORS_ORIGINS no Railway com https://legal.lasolutions.me"
echo "  4. Aponte o domínio para o Railway (opcional)"
echo ""
