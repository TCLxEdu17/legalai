import { Injectable, Logger } from '@nestjs/common';
import { RagService } from '../rag/rag.service';

export interface PredictionPromptParams {
  area: string;
  pedido: string;
  tribunal: string;
  resumoFatos?: string;
  jurisprudencias?: string[];
}

export interface PredictionResult {
  probabilidade: number;
  prazoMedio: number;
  fundamento?: string;
  pontosFavoraveis?: string[];
  pontosContrarios?: string[];
  jurisprudenciasRelevantes?: string[];
}

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(private readonly ragService: RagService | null) {}

  buildPredictionPrompt(params: PredictionPromptParams): string {
    const { area, pedido, tribunal, resumoFatos, jurisprudencias } = params;

    let prompt = `Você é um especialista em análise preditiva jurídica.

Analise a seguinte demanda e forneça uma estimativa de desfecho:

**Área do Direito:** ${area}
**Tribunal:** ${tribunal}
**Pedido Principal:** ${pedido}`;

    if (resumoFatos) {
      prompt += `\n**Resumo dos Fatos:** ${resumoFatos}`;
    }

    if (jurisprudencias && jurisprudencias.length > 0) {
      prompt += `\n\n**Jurisprudências Relevantes Encontradas:**\n${jurisprudencias.join('\n')}`;
    }

    prompt += `

Com base na jurisprudência consolidada do ${tribunal} e nos dados fornecidos, responda APENAS com um JSON no formato:
{
  "probabilidade": <0-100>,
  "prazoMedio": <estimativa em meses>,
  "fundamento": "<breve fundamento>",
  "pontosFavoraveis": ["<ponto1>", "<ponto2>"],
  "pontosContrarios": ["<ponto1>", "<ponto2>"],
  "jurisprudenciasRelevantes": ["<ementa1>", "<ementa2>"]
}`;

    return prompt;
  }

  parsePredictionResult(raw: string): PredictionResult {
    try {
      // Try to extract JSON from the response
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? jsonMatch[0] : raw;
      const parsed = JSON.parse(jsonStr);

      return {
        probabilidade: typeof parsed.probabilidade === 'number' ? parsed.probabilidade : 50,
        prazoMedio: typeof parsed.prazoMedio === 'number' ? parsed.prazoMedio : 12,
        fundamento: parsed.fundamento || '',
        pontosFavoraveis: Array.isArray(parsed.pontosFavoraveis) ? parsed.pontosFavoraveis : [],
        pontosContrarios: Array.isArray(parsed.pontosContrarios) ? parsed.pontosContrarios : [],
        jurisprudenciasRelevantes: Array.isArray(parsed.jurisprudenciasRelevantes)
          ? parsed.jurisprudenciasRelevantes
          : [],
      };
    } catch {
      this.logger.warn('Failed to parse prediction result JSON');
      return {
        probabilidade: 50,
        prazoMedio: 12,
        fundamento: 'Análise indisponível',
        pontosFavoraveis: [],
        pontosContrarios: [],
        jurisprudenciasRelevantes: [],
      };
    }
  }

  async getPrediction(params: PredictionPromptParams): Promise<PredictionResult> {
    if (!this.ragService) {
      return this.parsePredictionResult('{}');
    }

    try {
      const prompt = this.buildPredictionPrompt(params);
      // Uses the RAG service to get AI response
      const response = await (this.ragService as any).aiProvider.chat([
        { role: 'user', content: prompt },
      ]);
      return this.parsePredictionResult(response);
    } catch (err) {
      this.logger.error('Failed to get AI prediction', err);
      return {
        probabilidade: 50,
        prazoMedio: 12,
        fundamento: 'Não foi possível gerar análise preditiva no momento.',
        pontosFavoraveis: [],
        pontosContrarios: [],
        jurisprudenciasRelevantes: [],
      };
    }
  }
}
