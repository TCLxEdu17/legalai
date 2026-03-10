#!/bin/bash
# backup-prod-db.sh — Dump do banco de produção e retenção local de 7 dias
# Uso: ./scripts/backup-prod-db.sh
#
# Requer variáveis de ambiente (defina em ~/.zshrc ou ~/.bash_profile):
#   export PROD_DB_URL="postgresql://..."
#
# Opcional — upload para Cloudflare R2 via aws-cli compatível:
#   export R2_BACKUP_BUCKET="meu-bucket"
#   export R2_ENDPOINT_URL="https://<account_id>.r2.cloudflarestorage.com"
#   export R2_ACCESS_KEY_ID="..."
#   export R2_SECRET_ACCESS_KEY="..."
#
# Agendamento sugerido (crontab -e):
#   17 2 * * * /Users/edu/rag/scripts/backup-prod-db.sh >> /tmp/backup-prod.log 2>&1

set -e

LOG_FILE="/tmp/backup-prod.log"
BACKUP_DIR="$HOME/legalai-backups"
DATE=$(date +%Y%m%d)
DUMP_FILE="$BACKUP_DIR/legalai_backup_${DATE}.dump"
KEEP_DAYS=7

# Garantir que pg_dump está no PATH (macOS via Homebrew)
export PATH="/opt/homebrew/opt/libpq/bin:$PATH"

mkdir -p "$BACKUP_DIR"

echo "[$(date '+%Y-%m-%d %H:%M:%S')] ===== Iniciando backup de produção =====" | tee -a "$LOG_FILE"

# Verificar variável obrigatória
if [ -z "$PROD_DB_URL" ]; then
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERRO: PROD_DB_URL não definida. Abortando." | tee -a "$LOG_FILE"
  exit 1
fi

# 1. Dump do banco de produção
echo "[$(date '+%Y-%m-%d %H:%M:%S')] Criando dump em: $DUMP_FILE" | tee -a "$LOG_FILE"
pg_dump "$PROD_DB_URL" \
  --no-owner \
  --no-acl \
  -F c \
  -f "$DUMP_FILE"
echo "[$(date '+%Y-%m-%d %H:%M:%S')] Dump concluído — $(du -sh "$DUMP_FILE" | cut -f1)" | tee -a "$LOG_FILE"

# 2. Upload para R2 (opcional)
if [ -n "$R2_BACKUP_BUCKET" ] && [ -n "$R2_ENDPOINT_URL" ] && [ -n "$R2_ACCESS_KEY_ID" ] && [ -n "$R2_SECRET_ACCESS_KEY" ]; then
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] Enviando para R2: s3://${R2_BACKUP_BUCKET}/legalai_backup_${DATE}.dump" | tee -a "$LOG_FILE"
  AWS_ACCESS_KEY_ID="$R2_ACCESS_KEY_ID" \
  AWS_SECRET_ACCESS_KEY="$R2_SECRET_ACCESS_KEY" \
  aws s3 cp "$DUMP_FILE" "s3://${R2_BACKUP_BUCKET}/legalai_backup_${DATE}.dump" \
    --endpoint-url "$R2_ENDPOINT_URL" \
    --no-progress 2>&1 | tee -a "$LOG_FILE"
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] Upload para R2 concluído." | tee -a "$LOG_FILE"
else
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] R2 não configurado — backup salvo apenas localmente." | tee -a "$LOG_FILE"
fi

# 3. Remover backups locais com mais de KEEP_DAYS dias
echo "[$(date '+%Y-%m-%d %H:%M:%S')] Removendo backups com mais de ${KEEP_DAYS} dias em ${BACKUP_DIR}..." | tee -a "$LOG_FILE"
find "$BACKUP_DIR" -name "legalai_backup_*.dump" -mtime +${KEEP_DAYS} -exec rm -v {} \; | tee -a "$LOG_FILE"

echo "[$(date '+%Y-%m-%d %H:%M:%S')] ===== Backup concluído com sucesso! =====" | tee -a "$LOG_FILE"
