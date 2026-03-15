import { Injectable, Logger, Inject } from '@nestjs/common';
import { AI_PROVIDER_TOKEN, IAIProvider } from '../rag/providers/ai-provider.interface';

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

  constructor(
    @Inject(AI_PROVIDER_TOKEN) private readonly aiProvider: IAIProvider,
  ) {}

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

Com base na jurisprudência consolidada do ${tribunal} e nos dados fornecidos, responda APENAS com um JSON válido, sem texto adicional, sem markdown, sem explicações:
{
  "probabilidade": <número inteiro de 0 a 100>,
  "prazoMedio": <número inteiro de meses>,
  "fundamento": "<fundamento jurídico em 1-2 frases>",
  "pontosFavoraveis": ["<ponto1>", "<ponto2>"],
  "pontosContrarios": ["<ponto1>", "<ponto2>"],
  "jurisprudenciasRelevantes": ["<ementa resumida 1>", "<ementa resumida 2>"]
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
    try {
      const prompt = this.buildPredictionPrompt(params);
      const result = await this.aiProvider.generateChatCompletion(
        [{ role: 'user', content: prompt }],
        { temperature: 0.3, maxTokens: 1024 },
      );
      return this.parsePredictionResult(result.content);
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
