#!/bin/bash
# sync-staging-db.sh — Replica o banco de produção no banco de staging
# Uso: ./scripts/sync-staging-db.sh
#
# Requer variáveis de ambiente (defina em ~/.zshrc ou ~/.bash_profile):
#   export PROD_DB_URL="postgresql://..."
#   export STAGING_DB_URL="postgresql://..."

set -e

if [ -z "$PROD_DB_URL" ] || [ -z "$STAGING_DB_URL" ]; then
  echo "❌  Erro: defina PROD_DB_URL e STAGING_DB_URL no ambiente."
  echo "   Exemplo (adicione ao ~/.zshrc):"
  echo '   export PROD_DB_URL="postgresql://user:pass@host/db"'
  echo '   export STAGING_DB_URL="postgresql://user:pass@host/db"'
  exit 1
fi

DUMP_FILE="/tmp/legalai_prod_backup_$(date +%Y%m%d_%H%M%S).dump"

# Garantir que pg_dump está no PATH (macOS via Homebrew)
export PATH="/opt/homebrew/opt/libpq/bin:$PATH"

echo "🔄  Sincronizando banco de staging com produção..."
echo ""

# 1. Dump de prod
echo "▶  [1/3] Dump do banco de produção..."
pg_dump "$PROD_DB_URL" \
  --no-owner \
  --no-acl \
  -F c \
  -f "$DUMP_FILE"
echo "   OK — arquivo: $DUMP_FILE ($(du -sh "$DUMP_FILE" | cut -f1))"
echo ""

# 2. Limpar banco de staging
echo "▶  [2/3] Limpando banco de staging..."
STAGING_USER=$(echo "$STAGING_DB_URL" | sed 's|postgresql://\([^:]*\):.*|\1|')
psql "$STAGING_DB_URL" \
  -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public; GRANT ALL ON SCHEMA public TO \"$STAGING_USER\";" \
  > /dev/null
echo "   OK — schema recriado"
echo ""

# 3. Restore
echo "▶  [3/3] Restaurando dados no staging..."
pg_restore \
  --no-owner \
  --no-acl \
  -d "$STAGING_DB_URL" \
  "$DUMP_FILE"
echo "   OK — dados restaurados"
echo ""

# Limpar dump temporário
rm "$DUMP_FILE"

echo "✅  Staging sincronizado com produção com sucesso!"
