import { Injectable } from '@nestjs/common';

export interface GenerateContratoDto {
  tipo: 'fixo' | 'exito' | 'misto';
  clienteNome?: string;
  advogadoNome?: string;
  objeto?: string;
  valor?: number;
  percentual?: number;
  estimativa?: number;
  prazo?: string;
  foro?: string;
  oabAdvogado?: string;
}

function formatBRL(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
    .format(value)
    .replace(/\u00a0/g, '\u0020'); // normalize non-breaking space
}

@Injectable()
export class ContratosService {
  generateContrato(dto: GenerateContratoDto): string {
    const {
      tipo,
      clienteNome = '[NOME DO CLIENTE]',
      advogadoNome = '[NOME DO ADVOGADO]',
      objeto = '[OBJETO DO CONTRATO]',
      valor,
      percentual,
      estimativa,
      prazo = '[PRAZO]',
      foro = 'São Paulo/SP',
      oabAdvogado = '[OAB]',
    } = dto;

    const today = new Date().toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });

    let clausulaHonorarios = '';

    if (tipo === 'fixo' && valor !== undefined) {
      clausulaHonorarios = `CLÁUSULA SEGUNDA — DOS HONORÁRIOS ADVOCATÍCIOS

O CONTRATANTE obriga-se a pagar ao CONTRATADO, a título de honorários advocatícios, o valor fixo de ${formatBRL(valor)} (${valor.toLocaleString('pt-BR')} reais), conforme as seguintes condições:

a) O pagamento será realizado conforme cronograma a ser acordado entre as partes;
b) Em caso de êxito total na demanda, não haverá cobrança adicional além do valor fixo estipulado;
c) Os honorários de sucumbência eventualmente arbitrados pertencem exclusivamente ao advogado, nos termos do artigo 85 do Código de Processo Civil.`;
    } else if (tipo === 'exito' && percentual !== undefined) {
      clausulaHonorarios = `CLÁUSULA SEGUNDA — DOS HONORÁRIOS ADVOCATÍCIOS

Os honorários advocatícios serão calculados exclusivamente em caso de êxito, correspondendo a ${percentual}% (${percentual === 1 ? 'um' : percentual} por cento) do valor total obtido na demanda.

${estimativa !== undefined ? `Estimativa de valor da causa: ${formatBRL(estimativa)}.` : ''}

a) Não havendo êxito na demanda, nenhum honorário será devido pelo serviço prestado;
b) O percentual incidirá sobre o valor efetivamente recebido pelo CONTRATANTE;
c) Os honorários de sucumbência, se fixados, serão compensados com os honorários contratuais.`;
    } else if (tipo === 'misto') {
      clausulaHonorarios = `CLÁUSULA SEGUNDA — DOS HONORÁRIOS ADVOCATÍCIOS

Os honorários advocatícios serão pagos da seguinte forma:

${valor !== undefined ? `a) Honorário fixo (entrada): ${formatBRL(valor)}, pago no ato da assinatura deste contrato;` : 'a) Honorário fixo: [a definir];'}
${percentual !== undefined ? `b) Honorário de êxito: ${percentual}% (${percentual === 1 ? 'um' : percentual} por cento) sobre o valor obtido em caso de êxito na demanda.` : 'b) Honorário de êxito: [percentual a definir].'}

Os honorários de sucumbência eventualmente arbitrados pertencem ao advogado, nos termos da lei.`;
    }

    return `CONTRATO DE PRESTAÇÃO DE SERVIÇOS ADVOCATÍCIOS

Pelo presente instrumento particular, de um lado:

CONTRATANTE: ${clienteNome}, doravante denominado simplesmente CONTRATANTE;

CONTRATADO: ${advogadoNome}, inscrito na OAB sob o n.º ${oabAdvogado}, doravante denominado simplesmente CONTRATADO;

As partes acima identificadas têm, entre si, justo e acertado o presente Contrato de Prestação de Serviços Advocatícios, que se regerá pelas cláusulas seguintes e pelas condições descritas no presente.

CLÁUSULA PRIMEIRA — DO OBJETO

O CONTRATADO prestará serviços advocatícios ao CONTRATANTE, consistentes em: ${objeto}.

O CONTRATADO atuará com total autonomia técnica e independência, nos termos do Estatuto da Advocacia (Lei 8.906/1994) e do Código de Ética e Disciplina da OAB.

${clausulaHonorarios}

CLÁUSULA TERCEIRA — DAS OBRIGAÇÕES DO CONTRATANTE

O CONTRATANTE obriga-se a:

a) Fornecer ao CONTRATADO todos os documentos e informações necessários ao bom andamento do serviço;
b) Efetuar o pagamento dos honorários nos prazos ajustados;
c) Reembolsar despesas processuais (custas, perícias, diligências) mediante apresentação de comprovantes;
d) Comunicar imediatamente ao CONTRATADO qualquer fato relevante relacionado ao objeto do contrato.

CLÁUSULA QUARTA — DAS OBRIGAÇÕES DO CONTRATADO

O CONTRATADO obriga-se a:

a) Prestar os serviços com zelo, diligência e competência, observando os deveres éticos da advocacia;
b) Manter o CONTRATANTE informado sobre o andamento do processo/serviço;
c) Guardar sigilo sobre as informações recebidas do CONTRATANTE.

CLÁUSULA QUINTA — DA RESCISÃO

Este contrato poderá ser rescindido por qualquer das partes, mediante comunicação escrita com antecedência mínima de 10 (dez) dias, assegurado ao CONTRATADO o direito ao recebimento proporcional dos honorários pelos serviços já prestados.

CLÁUSULA SEXTA — DO PRAZO

O presente contrato vigorará pelo prazo necessário à conclusão dos serviços contratados${prazo !== '[PRAZO]' ? `, estimado em ${prazo}` : ''}.

CLÁUSULA SÉTIMA — DO FORO

As partes elegem o foro da comarca de ${foro} para dirimir eventuais litígios decorrentes deste contrato, renunciando a qualquer outro, por mais privilegiado que seja.

Por estarem assim justos e contratados, firmam o presente instrumento em 2 (duas) vias de igual teor.

${foro}, ${today}.


_______________________________
${clienteNome}
CONTRATANTE


_______________________________
${advogadoNome}
OAB n.º ${oabAdvogado}
CONTRATADO


_______________________________
TESTEMUNHA 1: ______________________ CPF: _______________


_______________________________
TESTEMUNHA 2: ______________________ CPF: _______________
`;
  }
}
