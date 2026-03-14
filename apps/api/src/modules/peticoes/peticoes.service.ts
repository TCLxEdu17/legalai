import { Injectable } from '@nestjs/common';
import { CasesService } from '../cases/cases.service';

const CHECKLISTS: Record<string, string[]> = {
  recurso_apelacao: [
    'Verificar tempestividade do recurso (15 dias)',
    'Confirmar preparo e custas de recurso',
    'Identificar o(s) capítulo(s) da sentença a ser(em) reformado(s)',
    'Redigir razões de apelação por tópico',
    'Citar jurisprudência do tribunal favorável',
    'Indicar cerceamento de defesa (se aplicável)',
    'Formular pedido expresso de provimento ou anulação',
    'Incluir comprovante de recolhimento do preparo',
  ],
  contestacao: [
    'Verificar prazo de contestação (15 dias regra geral)',
    'Analisar preliminares processuais cabíveis',
    'Verificar competência do juízo',
    'Negar fatos que não sejam verídicos',
    'Apresentar fundamentos jurídicos de mérito',
    'Citar jurisprudência favorável',
    'Formular pedido de improcedência total ou parcial',
    'Requerer produção de provas pertinentes',
    'Juntar documentos comprobatórios',
  ],
  peticao_inicial: [
    'Verificar competência do juízo',
    'Qualificar completamente as partes',
    'Narrar os fatos de forma clara e cronológica',
    'Fundamentar juridicamente o pedido',
    'Calcular e indicar o valor da causa',
    'Formular pedido principal e subsidiários',
    'Requerer citação do réu',
    'Indicar provas a serem produzidas',
    'Juntar documentos essenciais (procuração, contratos, etc.)',
  ],
  recurso_ordinario: [
    'Verificar cabimento do recurso ordinário',
    'Observar prazo de 8 dias (trabalhista)',
    'Identificar matérias impugnadas',
    'Redigir razões do recurso ordinário',
    'Citar jurisprudência do TST e TRT',
    'Formular pedido de reforma da sentença',
  ],
  embargos_declaracao: [
    'Identificar omissão, obscuridade ou contradição na decisão',
    'Observar prazo de 5 dias',
    'Apontar especificamente o ponto omisso ou contraditório',
    'Requerer efeito infringente se cabível',
    'Não usar embargos como recurso de mérito',
  ],
  agravo: [
    'Verificar modalidade de agravo cabível (interno ou de instrumento)',
    'Observar prazo (15 dias)',
    'Indicar a decisão agravada',
    'Formar instrumento completo (agravo de instrumento)',
    'Demonstrar fumus boni iuris e periculum in mora',
    'Formular pedido de efeito suspensivo se necessário',
  ],
  default: [
    'Verificar prazo para a peça',
    'Identificar o tipo de peça processual',
    'Qualificar as partes',
    'Narrar os fatos relevantes',
    'Fundamentar juridicamente',
    'Formular pedido expresso',
    'Juntar documentos necessários',
  ],
};

export interface BuildPeticaoContextParams {
  tipo: string;
  caso: {
    titulo: string;
    area: string;
    processNumber?: string;
    plaintiff?: string;
    defendant?: string;
    notes?: string;
  };
}

export interface PeticaoContext {
  tipo: string;
  instrucoes: string;
  checklist: string[];
}

@Injectable()
export class PeticoesService {
  constructor(private readonly casesService: CasesService | null) {}

  getChecklistPeticao(tipo: string): string[] {
    return CHECKLISTS[tipo] || CHECKLISTS.default;
  }

  buildPeticaoContext(params: BuildPeticaoContextParams): PeticaoContext {
    const { tipo, caso } = params;
    const checklist = this.getChecklistPeticao(tipo);

    const instrucoes = this.buildInstrucoes(tipo, caso);

    return { tipo, instrucoes, checklist };
  }

  private buildInstrucoes(
    tipo: string,
    caso: BuildPeticaoContextParams['caso'],
  ): string {
    const baseInstrucoes: Record<string, string> = {
      recurso_apelacao: `Redija uma apelação completa para o processo "${caso.titulo}" na área ${caso.area}. Analise a sentença e identifique os erros de fato e de direito. Inclua jurisprudência do tribunal e formule pedido expresso de reforma.`,
      contestacao: `Redija uma contestação completa para o processo "${caso.titulo}" na área ${caso.area}. Analise cada pedido do autor, apresente preliminares cabíveis, negue os fatos inverdadeiros e fundamente juridicamente o pedido de improcedência.`,
      peticao_inicial: `Redija uma petição inicial completa para "${caso.titulo}" na área ${caso.area}. Qualifique as partes, narre os fatos, fundamente juridicamente e formule pedidos claros com valor da causa.`,
    };

    return (
      baseInstrucoes[tipo] ||
      `Redija a peça processual do tipo "${tipo}" para o processo "${caso.titulo}" na área ${caso.area}. Siga os requisitos legais e a estrutura formal exigida.`
    );
  }
}
