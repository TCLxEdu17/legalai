'use client';

import { useState } from 'react';
import { PlanetLoader } from '@/components/ui/planet-loader';
import { Search, MapPin, Building2, User, CheckCircle, AlertCircle, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';
import { fetchCep, fetchCnpj, type CepResult, type CnpjResult } from '@/lib/lookups';
import { FadeIn } from '@/components/ui/motion';
import { cn } from '@/lib/utils';

type Tab = 'cep' | 'cnpj' | 'cpf';

// ─── CPF validation (no public API, validate locally) ──────────────
function validateCpf(cpf: string): boolean {
  const digits = cpf.replace(/\D/g, '');
  if (digits.length !== 11 || /^(\d)\1+$/.test(digits)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(digits[i]) * (10 - i);
  let r = (sum * 10) % 11;
  if (r === 10 || r === 11) r = 0;
  if (r !== parseInt(digits[9])) return false;
  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(digits[i]) * (11 - i);
  r = (sum * 10) % 11;
  if (r === 10 || r === 11) r = 0;
  return r === parseInt(digits[10]);
}

function formatCpf(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 11);
  return d.replace(/(\d{3})(\d{3})(\d{3})(\d{1,2})/, '$1.$2.$3-$4');
}

function formatCnpj(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 14);
  return d
    .replace(/(\d{2})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,4})$/, '$1/$2')
    .replace(/(\d{4})(\d{1,2})$/, '$1-$2');
}

function formatCep(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 8);
  return d.replace(/(\d{5})(\d{1,3})/, '$1-$2');
}

function Field({ label, value }: { label: string; value?: string }) {
  const [copied, setCopied] = useState(false);
  if (!value) return null;
  return (
    <div className="flex items-start justify-between gap-3 py-2.5 border-b border-white/[0.04] last:border-0">
      <div>
        <p className="text-[10px] text-slate-600 uppercase tracking-wide font-medium mb-0.5">{label}</p>
        <p className="text-slate-300 text-sm">{value}</p>
      </div>
      <button
        onClick={() => { navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
        className="shrink-0 text-slate-600 hover:text-slate-400 transition-colors mt-0.5"
        title="Copiar"
      >
        {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
      </button>
    </div>
  );
}

export default function ConsultasPage() {
  const [tab, setTab] = useState<Tab>('cep');

  // CEP state
  const [cepInput, setCepInput] = useState('');
  const [cepResult, setCepResult] = useState<CepResult | null>(null);
  const [cepLoading, setCepLoading] = useState(false);
  const [cepError, setCepError] = useState('');

  // CNPJ state
  const [cnpjInput, setCnpjInput] = useState('');
  const [cnpjResult, setCnpjResult] = useState<CnpjResult | null>(null);
  const [cnpjLoading, setCnpjLoading] = useState(false);
  const [cnpjError, setCnpjError] = useState('');

  // CPF state
  const [cpfInput, setCpfInput] = useState('');
  const [cpfValid, setCpfValid] = useState<boolean | null>(null);

  async function searchCep() {
    const digits = cepInput.replace(/\D/g, '');
    if (digits.length !== 8) { setCepError('CEP deve ter 8 dígitos'); return; }
    setCepError(''); setCepResult(null); setCepLoading(true);
    try {
      const data = await fetchCep(digits);
      setCepResult(data);
    } catch {
      setCepError('CEP não encontrado');
    } finally {
      setCepLoading(false);
    }
  }

  async function searchCnpj() {
    const digits = cnpjInput.replace(/\D/g, '');
    if (digits.length !== 14) { setCnpjError('CNPJ deve ter 14 dígitos'); return; }
    setCnpjError(''); setCnpjResult(null); setCnpjLoading(true);
    try {
      const data = await fetchCnpj(digits);
      setCnpjResult(data);
    } catch {
      setCnpjError('CNPJ não encontrado ou inválido');
    } finally {
      setCnpjLoading(false);
    }
  }

  function checkCpf() {
    const valid = validateCpf(cpfInput);
    setCpfValid(valid);
    if (!valid) toast.error('CPF inválido (dígitos verificadores incorretos)');
    else toast.success('CPF válido');
  }

  const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: 'cep', label: 'CEP', icon: MapPin },
    { id: 'cnpj', label: 'CNPJ', icon: Building2 },
    { id: 'cpf', label: 'CPF', icon: User },
  ];

  const inputCls = "w-full px-4 py-2.5 bg-[#111111] border border-white/10 text-slate-100 text-sm rounded-lg font-mono placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-500";

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <FadeIn>
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
            <Search className="w-6 h-6 text-brand-400" />
            Consultas
          </h1>
          <p className="text-slate-500 text-sm mt-1">CEP (ViaCEP), CNPJ (BrasilAPI), CPF (validação local)</p>
        </div>
      </FadeIn>

      {/* Tabs */}
      <FadeIn delay={0.1}>
        <div className="flex gap-1 bg-[#111111] border border-white/[0.07] rounded-xl p-1">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={cn(
                'flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all',
                tab === id
                  ? 'bg-brand-600/20 text-brand-400 border border-brand-500/25'
                  : 'text-slate-500 hover:text-slate-300 hover:bg-white/5',
              )}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>
      </FadeIn>

      {/* CEP */}
      {tab === 'cep' && (
        <FadeIn delay={0.05}>
          <div className="space-y-4">
            <div className="bg-[#141414] border border-white/[0.07] rounded-xl p-5 space-y-3">
              <label className="text-xs text-slate-500 block">CEP (8 dígitos)</label>
              <div className="flex gap-3">
                <input
                  value={cepInput}
                  onChange={(e) => { setCepInput(formatCep(e.target.value)); setCepError(''); }}
                  onKeyDown={(e) => e.key === 'Enter' && searchCep()}
                  placeholder="00000-000"
                  className={inputCls}
                />
                <button onClick={searchCep} disabled={cepLoading} className="flex items-center gap-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors shrink-0">
                  {cepLoading ? <PlanetLoader size="xs" /> : <Search className="w-4 h-4" />}
                  Buscar
                </button>
              </div>
              {cepError && (
                <p className="text-red-400 text-xs flex items-center gap-1"><AlertCircle className="w-3 h-3" />{cepError}</p>
              )}
            </div>

            {cepResult && (
              <div className="bg-[#141414] border border-white/[0.07] rounded-xl p-5">
                <div className="flex items-center gap-2 mb-4">
                  <CheckCircle className="w-4 h-4 text-emerald-500" />
                  <span className="text-sm font-semibold text-slate-200">Endereço encontrado</span>
                  <span className="ml-auto text-xs text-slate-600 font-mono">{cepResult.cep}</span>
                </div>
                <Field label="Logradouro" value={cepResult.logradouro} />
                <Field label="Complemento" value={cepResult.complemento} />
                <Field label="Bairro" value={cepResult.bairro} />
                <Field label="Município" value={cepResult.localidade} />
                <Field label="UF" value={cepResult.uf} />
                <Field label="Código IBGE" value={cepResult.ibge} />
              </div>
            )}
          </div>
        </FadeIn>
      )}

      {/* CNPJ */}
      {tab === 'cnpj' && (
        <FadeIn delay={0.05}>
          <div className="space-y-4">
            <div className="bg-[#141414] border border-white/[0.07] rounded-xl p-5 space-y-3">
              <label className="text-xs text-slate-500 block">CNPJ (14 dígitos)</label>
              <div className="flex gap-3">
                <input
                  value={cnpjInput}
                  onChange={(e) => { setCnpjInput(formatCnpj(e.target.value)); setCnpjError(''); }}
                  onKeyDown={(e) => e.key === 'Enter' && searchCnpj()}
                  placeholder="00.000.000/0000-00"
                  className={inputCls}
                />
                <button onClick={searchCnpj} disabled={cnpjLoading} className="flex items-center gap-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors shrink-0">
                  {cnpjLoading ? <PlanetLoader size="xs" /> : <Search className="w-4 h-4" />}
                  Buscar
                </button>
              </div>
              {cnpjError && (
                <p className="text-red-400 text-xs flex items-center gap-1"><AlertCircle className="w-3 h-3" />{cnpjError}</p>
              )}
            </div>

            {cnpjResult && (
              <div className="bg-[#141414] border border-white/[0.07] rounded-xl p-5">
                <div className="flex items-center gap-2 mb-4">
                  <CheckCircle className="w-4 h-4 text-emerald-500" />
                  <span className="text-sm font-semibold text-slate-200">{cnpjResult.razao_social}</span>
                </div>
                <Field label="Razão Social" value={cnpjResult.razao_social} />
                <Field label="Nome Fantasia" value={cnpjResult.nome_fantasia} />
                <Field label="CNPJ" value={cnpjResult.cnpj} />
                <Field label="Situação" value={cnpjResult.descricao_situacao_cadastral} />
                <Field label="CNAE Principal" value={cnpjResult.cnae_fiscal_descricao} />
                <Field label="Natureza Jurídica" value={cnpjResult.natureza_juridica} />
                <Field label="Porte" value={cnpjResult.porte} />
                <Field label="Capital Social" value={cnpjResult.capital_social ? `R$ ${cnpjResult.capital_social.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : undefined} />
                <Field label="Data de Abertura" value={cnpjResult.data_inicio_atividade} />
                <Field label="Telefone" value={cnpjResult.telefone1} />
                <Field label="Email" value={cnpjResult.email} />
                <Field label="Endereço" value={[cnpjResult.logradouro, cnpjResult.numero, cnpjResult.bairro].filter(Boolean).join(', ')} />
                <Field label="Município / UF" value={`${cnpjResult.municipio} / ${cnpjResult.uf}`} />
                <Field label="CEP" value={cnpjResult.cep} />
              </div>
            )}
          </div>
        </FadeIn>
      )}

      {/* CPF */}
      {tab === 'cpf' && (
        <FadeIn delay={0.05}>
          <div className="space-y-4">
            <div className="bg-[#141414] border border-white/[0.07] rounded-xl p-5 space-y-3">
              <label className="text-xs text-slate-500 block">CPF (11 dígitos)</label>
              <div className="flex gap-3">
                <input
                  value={cpfInput}
                  onChange={(e) => { setCpfInput(formatCpf(e.target.value)); setCpfValid(null); }}
                  onKeyDown={(e) => e.key === 'Enter' && checkCpf()}
                  placeholder="000.000.000-00"
                  className={cn(inputCls, cpfValid === true && 'border-emerald-500/50', cpfValid === false && 'border-red-500/50')}
                />
                <button onClick={checkCpf} className="flex items-center gap-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-sm font-medium transition-colors shrink-0">
                  <Search className="w-4 h-4" />
                  Validar
                </button>
              </div>
              {cpfValid !== null && (
                <p className={cn('text-xs flex items-center gap-1.5 font-medium', cpfValid ? 'text-emerald-400' : 'text-red-400')}>
                  {cpfValid
                    ? <><CheckCircle className="w-3.5 h-3.5" />CPF válido — dígitos verificadores corretos</>
                    : <><AlertCircle className="w-3.5 h-3.5" />CPF inválido — dígitos verificadores incorretos</>
                  }
                </p>
              )}
            </div>
            <div className="bg-[#141414] border border-white/[0.07] rounded-xl p-4">
              <p className="text-xs text-slate-500 leading-relaxed">
                <span className="text-slate-400 font-medium">Atenção:</span> A validação de CPF é feita localmente (algoritmo dos dígitos verificadores).
                Não há consulta a bases de dados da Receita Federal — isso exigiria integração paga com serviços autorizados.
                Um CPF validado aqui confirma apenas que os dígitos são matematicamente corretos.
              </p>
            </div>
          </div>
        </FadeIn>
      )}
    </div>
  );
}
