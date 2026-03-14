// ─── CEP (ViaCEP) ───────────────────────────────────────────────────────────

export interface CepResult {
  cep: string;
  logradouro: string;
  complemento: string;
  bairro: string;
  localidade: string;
  uf: string;
  ibge: string;
  erro?: boolean;
}

export async function fetchCep(cep: string): Promise<CepResult> {
  const clean = cep.replace(/\D/g, '');
  if (clean.length !== 8) throw new Error('CEP inválido');
  const res = await fetch(`https://viacep.com.br/ws/${clean}/json/`);
  const data = await res.json();
  if (data.erro) throw new Error('CEP não encontrado');
  return data;
}

// ─── CNPJ (BrasilAPI) ──────────────────────────────────────────────────────

export interface CnpjResult {
  cnpj: string;
  razao_social: string;
  nome_fantasia: string;
  descricao_situacao_cadastral: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  municipio: string;
  uf: string;
  cep: string;
  telefone1?: string;
  email?: string;
  porte: string;
  natureza_juridica: string;
  capital_social: number;
  cnae_fiscal_descricao: string;
  data_inicio_atividade: string;
}

export async function fetchCnpj(cnpj: string): Promise<CnpjResult> {
  const clean = cnpj.replace(/\D/g, '');
  if (clean.length !== 14) throw new Error('CNPJ inválido');
  const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${clean}`);
  if (!res.ok) throw new Error('CNPJ não encontrado');
  return res.json();
}

// ─── IBGE (Municípios) ─────────────────────────────────────────────────────

export interface IbgeMunicipio {
  id: number;
  nome: string;
}

export interface IbgeUf {
  id: number;
  sigla: string;
  nome: string;
}

export async function fetchUfs(): Promise<IbgeUf[]> {
  const res = await fetch('https://servicodados.ibge.gov.br/api/v1/localidades/estados?orderBy=nome');
  return res.json();
}

export async function fetchMunicipios(uf: string): Promise<IbgeMunicipio[]> {
  const res = await fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${uf}/municipios?orderBy=nome`);
  return res.json();
}

// ─── Cotação Dólar (AwesomeAPI) ─────────────────────────────────────────────

export interface CotacaoResult {
  code: string;
  name: string;
  bid: string;       // compra
  ask: string;       // venda
  high: string;
  low: string;
  varBid: string;    // variação
  pctChange: string; // % variação
  timestamp: string;
  create_date: string;
}

export async function fetchDollarRate(): Promise<CotacaoResult> {
  const res = await fetch('https://economia.awesomeapi.com.br/json/last/USD-BRL');
  const data = await res.json();
  return data.USDBRL;
}
