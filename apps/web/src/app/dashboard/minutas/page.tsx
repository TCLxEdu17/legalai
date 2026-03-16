'use client';

import { useState } from 'react';
import { PlanetLoader } from '@/components/ui/planet-loader';
import { useMutation } from '@tanstack/react-query';
import { FileEdit, Copy, Download } from 'lucide-react';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api-client';
import { extractApiErrorMessage } from '@/lib/utils';

const TEMPLATES = [
  { id: 'peticao-inicial', label: 'Petição Inicial', extraFields: ['reu', 'fatos', 'pedidos', 'valorCausa'] },
  { id: 'contestacao', label: 'Contestação', extraFields: ['autor', 'fatos', 'defesa'] },
  { id: 'recurso-apelacao', label: 'Recurso de Apelação', extraFields: ['sentenca', 'razoes'] },
  { id: 'contrato-honorarios', label: 'Contrato de Honorários', extraFields: ['valor', 'pagamento', 'faseProcessual'] },
  { id: 'procuracao', label: 'Procuração Ad Judicia', extraFields: ['poderes'] },
  { id: 'acordo-extrajudicial', label: 'Acordo Extrajudicial', extraFields: ['parteB', 'objeto', 'valor', 'condicoes'] },
];

const FIELD_LABELS: Record<string, string> = {
  // Common
  parteNome: 'Nome da parte',
  parteCpfCnpj: 'CPF/CNPJ da parte',
  parteEndereco: 'Endereço da parte',
  advogadoNome: 'Nome do advogado',
  advogadoOAB: 'OAB do advogado',
  tribunal: 'Tribunal / Vara',
  data: 'Data',
  // Extra
  reu: 'Réu',
  autor: 'Autor',
  fatos: 'Fatos',
  pedidos: 'Pedidos',
  valorCausa: 'Valor da causa',
  defesa: 'Argumentos de defesa',
  sentenca: 'Síntese da sentença',
  razoes: 'Razões recursais',
  valor: 'Valor',
  pagamento: 'Forma de pagamento',
  faseProcessual: 'Fase processual',
  poderes: 'Poderes específicos',
  parteB: 'Outra parte',
  objeto: 'Objeto do acordo',
  condicoes: 'Condições',
};

const COMMON_FIELDS = ['parteNome', 'parteCpfCnpj', 'parteEndereco', 'advogadoNome', 'advogadoOAB', 'tribunal', 'data'];

export default function MinutasPage() {
  const [templateId, setTemplateId] = useState(TEMPLATES[0].id);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [minuta, setMinuta] = useState<string | null>(null);

  const selectedTemplate = TEMPLATES.find((t) => t.id === templateId)!;
  const allFields = [...COMMON_FIELDS, ...selectedTemplate.extraFields];

  const generateMutation = useMutation({
    mutationFn: () => apiClient.generateMinuta(selectedTemplate.label, fields),
    onSuccess: (data) => setMinuta(data.minuta),
    onError: (e) => toast.error(extractApiErrorMessage(e)),
  });

  const copyMinuta = () => {
    if (minuta) { navigator.clipboard.writeText(minuta); toast.success('Minuta copiada!'); }
  };

  const downloadMinuta = () => {
    if (!minuta) return;
    const blob = new Blob([minuta], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedTemplate.id}-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const setTemplate = (id: string) => {
    setTemplateId(id);
    setFields({});
    setMinuta(null);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
          <FileEdit className="w-6 h-6 text-brand-400" />
          Minutas Automáticas
        </h1>
        <p className="text-slate-500 text-sm mt-1">Gere minutas processuais automaticamente com IA</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Form */}
        <div className="space-y-4">
          {/* Template selector */}
          <div>
            <label className="text-xs text-slate-500 mb-1.5 block">Tipo de documento</label>
            <div className="grid grid-cols-2 gap-2">
              {TEMPLATES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTemplate(t.id)}
                  className={`px-3 py-2 rounded-lg text-xs font-medium text-left transition-colors ${
                    templateId === t.id
                      ? 'bg-brand-600/15 text-brand-400 border border-brand-500/20'
                      : 'bg-white/[0.03] text-slate-400 border border-white/[0.07] hover:bg-white/[0.06]'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Fields */}
          <div className="bg-[#141414] border border-white/[0.07] rounded-xl p-4 space-y-3">
            {allFields.map((key) => {
              const isTextarea = ['fatos', 'pedidos', 'defesa', 'razoes', 'poderes', 'condicoes'].includes(key);
              return (
                <div key={key}>
                  <label className="text-xs text-slate-500 mb-1 block">{FIELD_LABELS[key] || key}</label>
                  {isTextarea ? (
                    <textarea
                      rows={3}
                      value={fields[key] || ''}
                      onChange={(e) => setFields({ ...fields, [key]: e.target.value })}
                      className="w-full px-3 py-2 bg-[#111111] border border-white/10 text-slate-100 text-sm rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  ) : (
                    <input
                      type={key === 'data' ? 'date' : 'text'}
                      value={fields[key] || ''}
                      onChange={(e) => setFields({ ...fields, [key]: e.target.value })}
                      className="w-full px-3 py-2 bg-[#111111] border border-white/10 text-slate-100 text-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  )}
                </div>
              );
            })}

            <button
              onClick={() => generateMutation.mutate()}
              disabled={!fields.parteNome || generateMutation.isPending}
              className="w-full py-2.5 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
            >
              {generateMutation.isPending ? <PlanetLoader size="xs" /> : <FileEdit className="w-4 h-4" />}
              {generateMutation.isPending ? 'Gerando...' : 'Gerar Minuta'}
            </button>
          </div>
        </div>

        {/* Output */}
        <div>
          {generateMutation.isPending && (
            <div className="space-y-2">
              {[...Array(8)].map((_, i) => <div key={i} className="h-4 rounded shimmer" style={{ width: `${70 + Math.random() * 30}%` }} />)}
            </div>
          )}
          {minuta && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-300">Minuta gerada</span>
                <div className="flex gap-2">
                  <button onClick={copyMinuta} className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 px-2 py-1 rounded transition-colors">
                    <Copy className="w-3.5 h-3.5" />
                    Copiar
                  </button>
                  <button onClick={downloadMinuta} className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 px-2 py-1 rounded transition-colors">
                    <Download className="w-3.5 h-3.5" />
                    .txt
                  </button>
                </div>
              </div>
              <div className="relative">
                <textarea
                  readOnly
                  value={minuta}
                  rows={30}
                  className="w-full px-4 py-3 bg-[#111111] border border-white/10 text-slate-300 text-xs rounded-xl resize-none font-mono leading-relaxed focus:outline-none"
                />
              </div>
            </div>
          )}
          {!minuta && !generateMutation.isPending && (
            <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-center bg-[#141414] border border-white/[0.07] rounded-xl">
              <FileEdit className="w-10 h-10 text-slate-600 mb-3" />
              <p className="text-slate-400 font-medium">Aguardando geração</p>
              <p className="text-slate-500 text-sm mt-1">Preencha os campos e clique em "Gerar Minuta"</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
