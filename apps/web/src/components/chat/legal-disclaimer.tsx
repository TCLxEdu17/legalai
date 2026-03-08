import { AlertTriangle } from 'lucide-react';

export function LegalDisclaimer() {
  return (
    <div className="flex items-start gap-2.5 px-4 py-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-400 text-xs">
      <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
      <p className="leading-relaxed">
        <strong>Aviso jurídico:</strong> As respostas do assistente são baseadas exclusivamente
        nas jurisprudências indexadas e têm caráter informativo. Não constituem parecer
        jurídico e não substituem a análise formal de advogado habilitado.
      </p>
    </div>
  );
}
