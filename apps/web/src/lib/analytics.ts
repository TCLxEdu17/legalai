import posthog from 'posthog-js';

function capture(event: string, props?: Record<string, unknown>) {
  if (typeof window === 'undefined' || !process.env.NEXT_PUBLIC_POSTHOG_KEY) return;
  posthog.capture(event, props);
}

// ── Landing ──────────────────────────────────────────────────────────────────
export const analytics = {
  /** Botão CTA clicado na landing page */
  landingCtaClicked(button: 'trial' | 'whatsapp' | 'login', section: 'hero' | 'cta_section') {
    capture('landing_cta_clicked', { button, section });
  },

  // ── Trial ──────────────────────────────────────────────────────────────────
  /** Usuário visualizou o formulário de trial (sem trial ativo) */
  trialFormViewed() {
    capture('trial_form_viewed');
  },
  /** Submit do formulário */
  trialFormSubmitted(hasEmail: boolean, hasPhone: boolean) {
    capture('trial_form_submitted', { has_email: hasEmail, has_phone: hasPhone });
  },
  /** Trial criado com sucesso */
  trialCreated(hasEmail: boolean, hasPhone: boolean) {
    capture('trial_created', { has_email: hasEmail, has_phone: hasPhone });
  },

  // ── Chat / IA ──────────────────────────────────────────────────────────────
  /** Mensagem enviada no chat global */
  aiChatMessageSent(messageLength: number, isNewSession: boolean) {
    capture('ai_chat_message_sent', { message_length: messageLength, is_new_session: isNewSession });
  },
  /** Mensagem enviada no copiloto de caso */
  caseChatMessageSent(messageLength: number, caseId: string) {
    capture('case_chat_message_sent', { message_length: messageLength, case_id: caseId });
  },
  /** Gerador de peças disparado */
  pieceGenerated(pieceType: string, caseId: string) {
    capture('piece_generated', { piece_type: pieceType, case_id: caseId });
  },

  // ── Jurisprudência ────────────────────────────────────────────────────────
  /** Busca realizada na tela de jurisprudências */
  jurisprudenciaSearched(queryLength: number) {
    capture('jurisprudencia_searched', { query_length: queryLength });
  },
  /** Documento de jurisprudência aberto */
  jurisprudenciaOpened(documentId: string) {
    capture('jurisprudencia_opened', { document_id: documentId });
  },

  // ── Documentos ────────────────────────────────────────────────────────────
  /** Upload concluído com sucesso */
  documentUploaded(fileType: string, fileSizeMb: number) {
    capture('document_uploaded', { file_type: fileType, file_size_mb: fileSizeMb });
  },

  // ── Casos ─────────────────────────────────────────────────────────────────
  /** Caso criado */
  caseCreated() {
    capture('case_created');
  },

  // ── Radares ───────────────────────────────────────────────────────────────
  /** Radar criado */
  radarCreated() {
    capture('radar_created');
  },

  // ── Identify ──────────────────────────────────────────────────────────────
  /** Identifica o usuário após login (associa eventos ao user real) */
  identify(userId: string, props: { name?: string; email?: string; role?: string }) {
    if (typeof window === 'undefined' || !process.env.NEXT_PUBLIC_POSTHOG_KEY) return;
    posthog.identify(userId, props);
  },
  /** Reset na saída (logout) */
  reset() {
    if (typeof window === 'undefined' || !process.env.NEXT_PUBLIC_POSTHOG_KEY) return;
    posthog.reset();
  },
};
