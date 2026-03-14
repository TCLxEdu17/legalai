import { Injectable, Logger } from '@nestjs/common';

export interface GenerateProcuracaoDto {
  outorgante: string;
  cpf?: string;
  rg?: string;
  nacionalidade?: string;
  estadoCivil?: string;
  profissao?: string;
  endereco?: string;
  advogado: string;
  oab: string;
  poderes: 'amplos' | 'especiais' | 'especificos' | string;
  processoNumero?: string;
  foro?: string;
}

export interface EnviarAssinaturaDto {
  email: string;
  conteudo: string;
  nomeCliente?: string;
}

export interface AssinaturaResult {
  status: 'simulado' | 'enviado';
  link: string | null;
  message: string;
}

@Injectable()
export class ProcuracoesService {
  private readonly logger = new Logger(ProcuracoesService.name);

  generateProcuracao(dto: GenerateProcuracaoDto): string {
    const {
      outorgante,
      cpf,
      rg,
      nacionalidade = 'brasileiro(a)',
      estadoCivil = 'não informado',
      profissao = 'não informado',
      endereco,
      advogado,
      oab,
      poderes,
      processoNumero,
      foro = 'São Paulo/SP',
    } = dto;

    const today = new Date().toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });

    const qualificacaoOutorgante = [
      outorgante,
      nacionalidade,
      estadoCivil,
      profissao,
      cpf ? `CPF n.º ${cpf}` : '',
      rg ? `RG n.º ${rg}` : '',
      endereco ? `residente em ${endereco}` : '',
    ]
      .filter(Boolean)
      .join(', ');

    let poderesTxt = '';
    if (poderes === 'amplos' || poderes === 'ad judicia') {
      poderesTxt = `os poderes da cláusula AD JUDICIA, em geral, para o foro em geral, podendo propor ações e defesa em Juízo, assinar petições, desistir, transigir, firmar compromisso, dar quitação, receber citação, confessar, reconhecer a procedência do pedido, renunciar a direitos, interpor recursos, substabelecer com ou sem reservas de poderes, praticar todos os atos necessários ao bom e fiel desempenho do presente mandato`;
    } else if (poderes === 'especiais') {
      const processoTxt = processoNumero
        ? ` no processo de n.º ${processoNumero}`
        : '';
      poderesTxt = `poderes especiais${processoTxt}, para representar o(a) OUTORGANTE perante o Poder Judiciário, com poderes para propor ações, contestar, recorrer, transigir, desistir, receber citações e intimações, podendo substabelecer, com reserva de iguais poderes`;
    } else {
      poderesTxt = `poderes ${poderes}${processoNumero ? ` para o processo n.º ${processoNumero}` : ''}, nos termos da lei`;
    }

    return `PROCURAÇÃO AD JUDICIA

OUTORGANTE: ${qualificacaoOutorgante};

OUTORGADO: ${advogado}, advogado(a) inscrito(a) na Ordem dos Advogados do Brasil — Seção ${oab}, com endereço profissional a ser indicado;

OBJETO: Pelo presente instrumento particular de mandato, o(a) OUTORGANTE nomeia e constitui seu bastante procurador(a) o(a) OUTORGADO(A) acima qualificado(a), conferindo-lhe ${poderesTxt}.

PODERES ESPECIAIS: Fica, desde já, autorizado(a) o(a) OUTORGADO(A) a receber citação inicial, confessar, reconhecer a procedência do pedido, transigir, desistir, renunciar ao direito sobre que se funda a ação, receber e dar quitação, firmar compromisso e substabelecer esta procuração, com ou sem reserva de poderes.

VALIDADE: A presente procuração é válida pelo prazo de 1 (um) ano a contar de sua assinatura, podendo ser renovada por acordo entre as partes.

FORO: Fica eleito o foro da comarca de ${foro} para dirimir quaisquer questões oriundas deste instrumento.

${foro}, ${today}.


_______________________________
${outorgante}
${cpf ? `CPF: ${cpf}` : 'OUTORGANTE'}


_______________________________
TESTEMUNHA 1: ______________________ CPF: _______________


_______________________________
TESTEMUNHA 2: ______________________ CPF: _______________

---
*Documento gerado pelo sistema LegalAI. Para validade jurídica, deve ser assinado pelo outorgante e reconhecido firma em cartório ou assinado digitalmente.*`;
  }

  async enviarAssinatura(dto: EnviarAssinaturaDto): Promise<AssinaturaResult> {
    const d4signToken = process.env.D4SIGN_TOKEN;

    if (!d4signToken) {
      this.logger.log(
        `[D4SIGN STUB] Would send signature link to ${dto.email} for client ${dto.nomeCliente || 'unknown'}`,
      );
      return {
        status: 'simulado',
        link: null,
        message: 'Integração com assinatura digital em breve',
      };
    }

    // If D4SIGN_TOKEN is configured, this would call the D4Sign API
    // For now, return simulado even with token (stub)
    this.logger.log(`D4Sign integration stub - would send to ${dto.email}`);
    return {
      status: 'simulado',
      link: null,
      message: 'Integração com assinatura digital em breve',
    };
  }
}
