'use client';

import { useState, useMemo } from 'react';
import {
  BookOpen,
  Search,
  Scroll,
  Quote,
  GraduationCap,
  X,
  ChevronRight,
  Shuffle,
  CheckCircle2,
  XCircle,
  RotateCcw,
  BookMarked,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type Tab = 'dicionario' | 'brocardos' | 'abreviaturas' | 'quiz';

// ─── DADOS ──────────────────────────────────────────────────────────────────

interface LatimTermo {
  termo: string;
  pronuncia?: string;
  traducao: string;
  definicao: string;
  area?: string;
  exemplo?: string;
}

interface Brocardo {
  latim: string;
  traducao: string;
  explicacao: string;
  area?: string;
}

interface Abreviatura {
  sigla: string;
  extensao: string;
  uso: string;
}

const TERMOS: LatimTermo[] = [
  { termo: 'Ab initio', pronuncia: 'abe i-NÍ-cio', traducao: 'Desde o início', definicao: 'Expressão que indica que algo é nulo ou inválido desde sua origem, retroagindo aos efeitos.', area: 'Direito Civil', exemplo: 'O contrato é nulo ab initio por incapacidade da parte.' },
  { termo: 'Ad cautelam', pronuncia: 'ade cau-TÉ-lam', traducao: 'Por cautela', definicao: 'Ato praticado preventivamente, por precaução, para evitar consequências futuras.', area: 'Processo Civil', exemplo: 'Recorreu ad cautelam para não correr risco de perder o prazo.' },
  { termo: 'Ad hoc', pronuncia: 'ade ók', traducao: 'Para isso / Para este fim', definicao: 'Criado ou designado especificamente para uma finalidade determinada, sem caráter permanente.', area: 'Geral', exemplo: 'Nomeou um curador ad hoc para o incapaz no processo.' },
  { termo: 'Ad referendum', pronuncia: 'ade re-fe-RÊN-dum', traducao: 'À aprovação / Para referendo', definicao: 'Decisão tomada provisoriamente, sujeita à ratificação ou aprovação posterior.', area: 'Direito Internacional', exemplo: 'O tratado foi assinado ad referendum pelo Ministério.' },
  { termo: 'Actio', pronuncia: 'Á-cio', traducao: 'Ação', definicao: 'No direito romano, o direito de ir a juízo reclamar o que é seu. Origem das ações processuais modernas.', area: 'Direito Processual' },
  { termo: 'Actio in rem', pronuncia: 'Á-cio in rém', traducao: 'Ação real', definicao: 'Ação que tutela direito real (propriedade, posse), oponível contra todos (erga omnes).', area: 'Direito Civil' },
  { termo: 'Actio personalis', pronuncia: 'Á-cio per-so-NÁ-lis', traducao: 'Ação pessoal', definicao: 'Ação fundada em direito pessoal ou obrigação, dirigida contra determinada pessoa.', area: 'Direito Civil' },
  { termo: 'Aequitas', pronuncia: 'É-qui-tas', traducao: 'Equidade', definicao: 'Princípio de justiça que busca a aplicação do direito com flexibilidade, considerando as circunstâncias do caso.', area: 'Filosofia do Direito' },
  { termo: 'Alibi', pronuncia: 'Á-li-bi', traducao: 'Em outro lugar', definicao: 'Prova ou alegação de que o acusado estava em local diferente do crime no momento de sua ocorrência.', area: 'Direito Penal', exemplo: 'O réu apresentou alibi sólido: estava em outra cidade.' },
  { termo: 'Amicus curiae', pronuncia: 'Â-mi-cus CÚ-riae', traducao: 'Amigo da corte', definicao: 'Terceiro não parte que ingressa no processo para oferecer informações relevantes ao julgamento, em especial em causas de repercussão geral.', area: 'Processo Civil', exemplo: 'O STF admitiu entidades como amicus curiae no julgamento.' },
  { termo: 'Animus', pronuncia: 'Â-ni-mus', traducao: 'Ânimo / Intenção', definicao: 'Elemento subjetivo, a vontade ou intenção que orienta uma conduta. Ex: animus necandi (intenção de matar).', area: 'Direito Penal' },
  { termo: 'Animus domini', pronuncia: 'Â-ni-mus DÓ-mi-ni', traducao: 'Intenção de dono', definicao: 'Vontade de ter a coisa como própria, um dos elementos da posse ad usucapionem.', area: 'Direito Civil' },
  { termo: 'Argumentum ad absurdum', traducao: 'Argumento ao absurdo', definicao: 'Técnica de demonstrar a invalidade de uma tese mostrando que sua aceitação levaria a conclusões absurdas.', area: 'Lógica Jurídica' },
  { termo: 'Bis in idem', pronuncia: 'bis in Í-dem', traducao: 'Duas vezes pelo mesmo', definicao: 'Proibição de punir ou processar alguém duas vezes pelo mesmo fato. Princípio constitucional implícito.', area: 'Direito Penal', exemplo: 'A segunda condenação viola o princípio bis in idem.' },
  { termo: 'Causa petendi', pronuncia: 'CÁU-sa pe-TÊN-di', traducao: 'Causa de pedir', definicao: 'Fundamento fático e jurídico do pedido. Um dos elementos da demanda judicial (junto com partes e pedido).', area: 'Processo Civil' },
  { termo: 'Caveat', pronuncia: 'CÁ-ve-at', traducao: 'Cuidado / Advertência', definicao: 'Ressalva ou aviso sobre possível risco ou limitação de uma afirmação ou ato.', area: 'Geral', exemplo: 'Caveat: o prazo prescricional pode variar conforme o caso.' },
  { termo: 'Compos mentis', pronuncia: 'CÓM-pos MÊN-tis', traducao: 'Senhor da mente', definicao: 'Pessoa que possui plena capacidade mental para praticar atos jurídicos. Oposto de non compos mentis.', area: 'Direito Civil' },
  { termo: 'Conditio sine qua non', pronuncia: 'con-DÍ-cio SÍ-ne quá non', traducao: 'Condição sem a qual não', definicao: 'Requisito indispensável. Na causalidade penal, a teoria que considera causa toda condição sem a qual o resultado não ocorreria.', area: 'Direito Penal' },
  { termo: 'Corpus delicti', pronuncia: 'CÓR-pus de-LÍC-ti', traducao: 'Corpo do delito', definicao: 'Conjunto das provas materiais que comprovam a existência de um crime. O exame de corpo de delito.', area: 'Direito Penal' },
  { termo: 'Culpa in eligendo', traducao: 'Culpa na escolha', definicao: 'Responsabilidade do empregador ou comitente pela má escolha de empregado ou preposto que causou dano.', area: 'Direito Civil' },
  { termo: 'Culpa in vigilando', traducao: 'Culpa na vigilância', definicao: 'Responsabilidade por omissão no dever de vigiar pessoa ou coisa sob guarda do responsável.', area: 'Direito Civil' },
  { termo: 'Data venia', pronuncia: 'DÁ-ta VÊ-nia', traducao: 'Com a devida licença / Vênia concedida', definicao: 'Expressão de cortesia usada ao discordar respeitosamente de uma posição, especialmente de tribunal superior.', area: 'Praxe Forense', exemplo: 'Data venia, o acórdão recorrido merece reforma.' },
  { termo: 'De cujus', pronuncia: 'de CÚ-jus', traducao: 'Do falecido', definicao: 'O autor da herança; o falecido que deixou bens a inventariar. Abreviação de "is de cujus hereditate agitur".', area: 'Direito Sucessório' },
  { termo: 'De lege ferenda', traducao: 'Do direito a ser feito', definicao: 'Argumento ou proposta sobre como a lei deveria ser, em contraposição ao direito vigente (de lege lata).', area: 'Filosofia do Direito' },
  { termo: 'De lege lata', traducao: 'Da lei existente', definicao: 'Interpretação ou análise do direito tal como ele é, do ordenamento jurídico vigente.', area: 'Filosofia do Direito' },
  { termo: 'Dolo', pronuncia: 'DÓ-lo', traducao: 'Dolo / Engano', definicao: 'Vício do consentimento que consiste em induzir alguém a erro mediante artifício ou manobra ardilosa. No direito penal, é a vontade consciente de praticar o ilícito.', area: 'Direito Civil / Penal' },
  { termo: 'Erga omnes', pronuncia: 'ÉR-ga ÔM-nes', traducao: 'Contra todos / Oponível a todos', definicao: 'Eficácia de uma norma ou decisão que produz efeitos em relação a todas as pessoas, não apenas às partes do processo.', area: 'Direito Constitucional', exemplo: 'As decisões do STF em controle abstrato têm efeito erga omnes.' },
  { termo: 'Ex nunc', pronuncia: 'éx nunc', traducao: 'Desde agora', definicao: 'Efeito que se projeta somente para o futuro, sem retroatividade. Oposto de ex tunc.', area: 'Direito Civil', exemplo: 'A rescisão do contrato produz efeitos ex nunc.' },
  { termo: 'Ex tunc', pronuncia: 'éx tunc', traducao: 'Desde então', definicao: 'Efeito que retroage à data do ato ou fato, tornando-o inválido desde sua origem. Oposto de ex nunc.', area: 'Direito Civil', exemplo: 'A nulidade absoluta opera ex tunc.' },
  { termo: 'Ex officio', pronuncia: 'éx Ó-fi-cio', traducao: 'De ofício / Por dever do cargo', definicao: 'Ato praticado por iniciativa própria do agente público, sem provocação das partes, em virtude de seu dever funcional.', area: 'Processo Civil', exemplo: 'O juiz decretou a nulidade ex officio.' },
  { termo: 'Exceptio', pronuncia: 'ex-CÉP-cio', traducao: 'Exceção', definicao: 'Defesa do réu que paralisa ou destrói a eficácia da pretensão do autor, sem negar o fato constitutivo.', area: 'Processo Civil' },
  { termo: 'Fumus boni iuris', pronuncia: 'FÚ-mus BÔ-ni IÚ-ris', traducao: 'Fumaça do bom direito', definicao: 'Um dos requisitos para concessão de tutela de urgência: a plausibilidade do direito invocado pelo requerente.', area: 'Processo Civil', exemplo: 'Presentes fumus boni iuris e periculum in mora, defiro a liminar.' },
  { termo: 'Habeas corpus', pronuncia: 'HÁ-be-as CÓR-pus', traducao: 'Que tenhas o corpo', definicao: 'Ação constitucional que protege a liberdade de locomoção contra prisão ilegal ou ameaça de constrangimento ilegal.', area: 'Direito Processual Penal', exemplo: 'Impetrou habeas corpus preventivo ante ameaça de prisão.' },
  { termo: 'Habeas data', pronuncia: 'HÁ-be-as DÁ-ta', traducao: 'Que tenhas os dados', definicao: 'Ação constitucional para garantir acesso a informações relativas à própria pessoa constantes de registros públicos.', area: 'Direito Constitucional' },
  { termo: 'In abstracto', traducao: 'Em abstrato', definicao: 'Análise ou julgamento realizado em tese, sem considerar as circunstâncias concretas de um caso específico.', area: 'Direito Constitucional' },
  { termo: 'In concreto', traducao: 'Em concreto', definicao: 'Análise das circunstâncias específicas de um caso real, em oposição à análise abstrata.', area: 'Geral' },
  { termo: 'In dubio pro reo', pronuncia: 'in DÚ-bio pro RÉ-o', traducao: 'Na dúvida, a favor do réu', definicao: 'Princípio do direito penal: na dúvida quanto à culpabilidade, decide-se em favor do acusado. Corolário da presunção de inocência.', area: 'Direito Penal', exemplo: 'Na dúvida entre a versão do réu e da vítima, aplica-se o in dubio pro reo.' },
  { termo: 'In dubio pro societate', pronuncia: 'in DÚ-bio pro so-ci-e-TÁ-te', traducao: 'Na dúvida, a favor da sociedade', definicao: 'No tribunal do júri, diante de indícios mínimos, pronuncia-se o réu para que a sociedade decida.', area: 'Direito Processual Penal' },
  { termo: 'Inter partes', pronuncia: 'ÍN-ter PÁR-tes', traducao: 'Entre as partes', definicao: 'Efeitos que se limitam às partes do processo, sem alcançar terceiros. Oposto de erga omnes.', area: 'Processo Civil' },
  { termo: 'Inter vivos', pronuncia: 'ÍN-ter VÍ-vos', traducao: 'Entre vivos', definicao: 'Negócio jurídico celebrado entre pessoas vivas, com efeitos imediatos. Oposto de causa mortis.', area: 'Direito Civil' },
  { termo: 'Intuitu personae', pronuncia: 'in-TÚ-i-tu per-SÓ-nae', traducao: 'Em razão da pessoa', definicao: 'Contrato ou obrigação celebrado em atenção às qualidades pessoais do contratante, sendo intransferível.', area: 'Direito Civil' },
  { termo: 'Ipso facto', pronuncia: 'ÍP-so FÁC-to', traducao: 'Pelo próprio fato', definicao: 'Consequência que decorre automaticamente do fato, sem necessidade de ato posterior.', area: 'Geral', exemplo: 'A resolução opera-se ipso facto com o inadimplemento.' },
  { termo: 'Ipso iure', pronuncia: 'ÍP-so IÚ-re', traducao: 'Pelo próprio direito', definicao: 'Efeito que decorre automaticamente da lei, independentemente de declaração judicial.', area: 'Direito Civil' },
  { termo: 'Iura novit curia', pronuncia: 'IÚ-ra NÓ-vit CÚ-ria', traducao: 'A corte conhece o direito', definicao: 'Princípio que permite ao juiz aplicar a norma correta independentemente da indicação das partes; as partes alegam os fatos, o juiz aplica o direito.', area: 'Processo Civil' },
  { termo: 'Iuris tantum', pronuncia: 'IÚ-ris TÂN-tum', traducao: 'Apenas de direito', definicao: 'Presunção relativa que admite prova em contrário. Oposto de iuris et de iure (presunção absoluta).', area: 'Direito Civil' },
  { termo: 'Lato sensu', pronuncia: 'LÁ-to SÊN-su', traducao: 'Em sentido amplo', definicao: 'Interpretação ou uso de um termo em sua acepção mais abrangente. Oposto de stricto sensu.', area: 'Geral' },
  { termo: 'Lex posterior derogat priori', traducao: 'Lei posterior derroga anterior', definicao: 'Critério de solução de antinomia: norma posterior revoga norma anterior sobre o mesmo assunto.', area: 'Teoria Geral do Direito' },
  { termo: 'Lex specialis derogat generali', traducao: 'Lei especial derroga a geral', definicao: 'Norma específica prevalece sobre norma geral quando ambas regulam a mesma matéria.', area: 'Teoria Geral do Direito' },
  { termo: 'Litispendência', pronuncia: 'li-tis-pen-DÊN-cia', traducao: 'Pendência do litígio', definicao: 'Existência de processo em curso entre as mesmas partes com mesmo pedido e causa de pedir, gerando extinção do segundo.', area: 'Processo Civil' },
  { termo: 'Mens legis', pronuncia: 'mêns LÉ-gis', traducao: 'Mente da lei', definicao: 'A intenção ou espírito da lei; interpretação teleológica que busca o fim visado pelo legislador.', area: 'Hermenêutica' },
  { termo: 'Modus operandi', pronuncia: 'MÓ-dus o-pe-RÂN-di', traducao: 'Modo de operar', definicao: 'Forma característica como alguém pratica atos, especialmente usada em investigações criminais para identificar autoria.', area: 'Direito Penal', exemplo: 'O modus operandi confirma a autoria serial do acusado.' },
  { termo: 'Mutatis mutandis', pronuncia: 'mu-TÁ-tis mu-TÂN-dis', traducao: 'Mudando o que deve ser mudado', definicao: 'Expressão que indica que se aplica a mesma regra a casos análogos, com as adaptações necessárias.', area: 'Geral', exemplo: 'Aplica-se, mutatis mutandis, o mesmo raciocínio ao caso concreto.' },
  { termo: 'Nemo tenetur se detegere', traducao: 'Ninguém é obrigado a se descobrir', definicao: 'Direito ao silêncio e à não autoincriminação. Garantia constitucional do acusado de não produzir prova contra si mesmo.', area: 'Direito Penal' },
  { termo: 'Non bis in idem', traducao: 'Não duas vezes pelo mesmo', definicao: 'Princípio que veda a dupla punição pelo mesmo fato. Variação de "bis in idem".', area: 'Direito Penal' },
  { termo: 'Nullum crimen sine lege', traducao: 'Não há crime sem lei', definicao: 'Princípio da legalidade penal: só existe crime quando há lei prévia que o defina. Previsto no art. 1º do CP.', area: 'Direito Penal' },
  { termo: 'Nulla poena sine lege', traducao: 'Não há pena sem lei', definicao: 'Extensão do princípio da legalidade: a pena deve estar prevista em lei anterior ao fato.', area: 'Direito Penal' },
  { termo: 'Onus probandi', pronuncia: 'Ô-nus pro-BÂN-di', traducao: 'Ônus da prova', definicao: 'Encargo atribuído a cada parte de demonstrar os fatos que alega. Incumbe ao autor provar o fato constitutivo; ao réu, o extintivo, modificativo ou impeditivo.', area: 'Processo Civil' },
  { termo: 'Pacta sunt servanda', pronuncia: 'PÁC-ta sunt ser-VÂN-da', traducao: 'Os pactos devem ser cumpridos', definicao: 'Princípio da força obrigatória dos contratos: o contrato faz lei entre as partes e deve ser cumprido.', area: 'Direito Civil', exemplo: 'O devedor é obrigado a cumprir o contrato: pacta sunt servanda.' },
  { termo: 'Periculum in mora', pronuncia: 'pe-RÍ-cu-lum in MÓ-ra', traducao: 'Perigo na demora', definicao: 'Risco de dano decorrente da demora na prestação jurisdicional. Requisito para concessão de tutela de urgência.', area: 'Processo Civil', exemplo: 'Presentes o fumus boni iuris e periculum in mora, defiro a liminar.' },
  { termo: 'Post mortem', pronuncia: 'pôst MÓR-tem', traducao: 'Após a morte', definicao: 'Referente a atos, efeitos ou situações que ocorrem ou se produzem após o falecimento de alguém.', area: 'Direito Sucessório' },
  { termo: 'Prima facie', pronuncia: 'PRÍ-ma FÁ-cie', traducao: 'À primeira vista', definicao: 'Prova ou argumento que, à primeira análise, parece suficiente para estabelecer um fato ou direito, até que prova contrária seja apresentada.', area: 'Processo Civil', exemplo: 'Prima facie, os documentos demonstram o direito do autor.' },
  { termo: 'Pro rata', pronuncia: 'pró RÁ-ta', traducao: 'Proporcionalmente', definicao: 'De forma proporcional; distribuição de valor ou obrigação de acordo com a participação ou quota de cada um.', area: 'Direito Civil', exemplo: 'Os condôminos respondem pro rata pela dívida condominial.' },
  { termo: 'Quantum debeatur', pronuncia: 'QUÂN-tum de-be-Á-tur', traducao: 'Quanto é devido', definicao: 'Fase da liquidação em que se apura o valor da condenação, após o an debeatur (se é devido).', area: 'Processo Civil' },
  { termo: 'Ratio decidendi', pronuncia: 'RÁ-cio de-ci-DÊN-di', traducao: 'Razão de decidir', definicao: 'A fundamentação essencial da decisão judicial, que constitui precedente vinculante. Distingue-se do obiter dictum.', area: 'Teoria dos Precedentes', exemplo: 'A ratio decidendi do precedente vincula os demais juízes.' },
  { termo: 'Res judicata', pronuncia: 'rés ju-di-CÁ-ta', traducao: 'Coisa julgada', definicao: 'Imutabilidade da decisão judicial transitada em julgado, que não mais admite recurso ou ação ordinária para modificação.', area: 'Processo Civil', exemplo: 'A sentença transitou em julgado, operando-se a res judicata.' },
  { termo: 'Res nullius', pronuncia: 'rés NÚ-li-us', traducao: 'Coisa de ninguém', definicao: 'Bem sem dono que pode ser objeto de ocupação e apropriação pelo primeiro que o tomar.', area: 'Direito Civil' },
  { termo: 'Sine die', pronuncia: 'SÍ-ne DÍ-e', traducao: 'Sem dia marcado', definicao: 'Adiamento ou suspensão por prazo indeterminado, sem data fixada para retomada.', area: 'Processo Civil', exemplo: 'A audiência foi adiada sine die.' },
  { termo: 'Stare decisis', pronuncia: 'STÁ-re de-CÍ-sis', traducao: 'Manter o decidido', definicao: 'Princípio do respeito aos precedentes judiciais. Fundamento do sistema de precedentes vinculantes do CPC/2015.', area: 'Teoria dos Precedentes' },
  { termo: 'Status quo', pronuncia: 'STÁ-tus quó', traducao: 'Estado em que se encontra', definicao: 'A situação atual ou existente. Frequentemente usado para indicar a manutenção do estado de coisas vigente.', area: 'Geral' },
  { termo: 'Stricto sensu', pronuncia: 'STRÍ-cto SÊN-su', traducao: 'Em sentido estrito', definicao: 'Interpretação restritiva de um termo, em sua acepção mais limitada e técnica. Oposto de lato sensu.', area: 'Geral' },
  { termo: 'Sub judice', pronuncia: 'sub JÚ-di-ce', traducao: 'Sob julgamento', definicao: 'Matéria que está sendo apreciada pelo Judiciário, pendente de decisão final.', area: 'Processo Civil' },
  { termo: 'Summum ius, summa iniuria', traducao: 'O máximo direito, a máxima injustiça', definicao: 'Máxima de Cícero indicando que a aplicação excessivamente rígida do direito pode gerar injustiça. Fundamento da equidade.', area: 'Filosofia do Direito' },
  { termo: 'Tempus regit actum', pronuncia: 'TÊM-pus RÉ-git ÁC-tum', traducao: 'O tempo rege o ato', definicao: 'A lei vigente ao tempo da prática do ato é a que o regula, em matéria de validade e eficácia.', area: 'Direito Intertemporal' },
  { termo: 'Ultra petita', pronuncia: 'ÚL-tra pe-TÍ-ta', traducao: 'Além do pedido', definicao: 'Vício da sentença que concede ao autor mais do que foi pedido. Causa de nulidade parcial da decisão.', area: 'Processo Civil' },
  { termo: 'Venire contra factum proprium', traducao: 'Ir contra ato próprio', definicao: 'Vedação ao comportamento contraditório. Princípio da boa-fé objetiva que impede o exercício de direito contrário à conduta anterior do titular.', area: 'Direito Civil', exemplo: 'A cláusula é ineficaz por venire contra factum proprium.' },
  { termo: 'Vis maior', pronuncia: 'vis MA-ior', traducao: 'Força maior', definicao: 'Acontecimento inevitável e imprevisível que exclui a responsabilidade civil por ser estranho à vontade do agente.', area: 'Direito Civil', exemplo: 'O atraso foi causado por vis maior — tempestade que interditou o acesso.' },
];

const BROCARDOS: Brocardo[] = [
  { latim: 'Nemo plus iuris ad alium transferre potest quam ipse habet', traducao: 'Ninguém pode transferir a outrem mais direito do que ele mesmo tem', explicacao: 'Princípio fundamental do direito civil: a validade da transferência de direitos está limitada ao que o transmitente efetivamente possui. Base da proteção do adquirente de boa-fé.', area: 'Direito Civil' },
  { latim: 'Ubi eadem ratio, ibi idem ius', traducao: 'Onde existe a mesma razão, existe o mesmo direito', explicacao: 'Fundamento da analogia jurídica: casos semelhantes devem receber o mesmo tratamento jurídico.', area: 'Hermenêutica' },
  { latim: 'Nemo potest venire contra factum proprium', traducao: 'Ninguém pode ir contra seu próprio ato', explicacao: 'Vedação ao comportamento contraditório. Expressão da boa-fé objetiva e da proteção da confiança legítima.', area: 'Direito Civil' },
  { latim: 'Da mihi factum, dabo tibi ius', traducao: 'Dá-me os fatos, dar-te-ei o direito', explicacao: 'As partes devem apresentar os fatos; o juiz aplica o direito. Fundamento do iura novit curia e da causa de pedir.', area: 'Processo Civil' },
  { latim: 'In dubio pro reo', traducao: 'Na dúvida, a favor do réu', explicacao: 'Princípio basilar do processo penal: a dúvida sobre a culpabilidade deve beneficiar o acusado.', area: 'Direito Penal' },
  { latim: 'Actori incumbit onus probandi', traducao: 'Ao autor incumbe o ônus da prova', explicacao: 'Quem alega um fato tem o encargo de prová-lo. Regra geral de distribuição do ônus da prova no processo civil.', area: 'Processo Civil' },
  { latim: 'Exceptio probat regulam in casibus non exceptis', traducao: 'A exceção confirma a regra nos casos não excetuados', explicacao: 'A existência de uma exceção implica a existência de uma regra geral. Raciocínio a contrario sensu.', area: 'Hermenêutica' },
  { latim: 'Inclusio unius, exclusio alterius', traducao: 'A inclusão de um implica a exclusão do outro', explicacao: 'Quando a lei enumera casos expressamente, outros casos análogos não enumerados estão excluídos.', area: 'Hermenêutica' },
  { latim: 'Nemo auditur propriam turpitudinem allegans', traducao: 'Ninguém é ouvido quando alega a própria torpeza', explicacao: 'Quem age de má-fé não pode invocar sua própria conduta desonrosa para beneficiar-se em juízo.', area: 'Direito Civil' },
  { latim: 'Pacta sunt servanda', traducao: 'Os pactos devem ser cumpridos', explicacao: 'Princípio da força obrigatória dos contratos. O acordo de vontades gera lei entre as partes.', area: 'Direito Contratual' },
  { latim: 'Rebus sic stantibus', traducao: 'Estando assim as coisas', explicacao: 'Cláusula implícita segundo a qual os contratos de trato sucessivo obrigam enquanto as circunstâncias permanecidas iguais. Base da teoria da imprevisão.', area: 'Direito Contratual' },
  { latim: 'Lex specialis derogat generali', traducao: 'A lei especial derroga a geral', explicacao: 'Critério de solução de antinomia: norma especial prevalece sobre norma geral quando regulam o mesmo assunto.', area: 'Teoria Geral do Direito' },
  { latim: 'Ubi lex non distinguit, nec nos distinguere debemus', traducao: 'Onde a lei não distingue, não devemos nós distinguir', explicacao: 'Princípio interpretativo: quando a lei é clara e genérica, o intérprete não pode criar distinções não previstas.', area: 'Hermenêutica' },
  { latim: 'Nullum crimen, nulla poena sine praevia lege poenali', traducao: 'Nenhum crime, nenhuma pena sem lei penal prévia', explicacao: 'Princípio da legalidade penal em sua formulação clássica. Garantia fundamental do Estado de Direito.', area: 'Direito Penal' },
  { latim: 'Error iuris nocet', traducao: 'O erro de direito prejudica', explicacao: 'O desconhecimento da lei não escusa. Exceto em situações específicas, o erro sobre a existência ou conteúdo da norma não isenta de responsabilidade.', area: 'Teoria Geral do Direito' },
  { latim: 'Dormientibus non sucurrit ius', traducao: 'O direito não socorre os que dormem', explicacao: 'Fundamento da prescrição e decadência: aquele que não exerce seu direito tempestivamente pode perdê-lo.', area: 'Direito Civil' },
  { latim: 'Qui tacet consentire videtur', traducao: 'Quem cala parece consentir', explicacao: 'O silêncio, em determinadas circunstâncias, pode ser interpretado como concordância. Aplicado com cautela no direito brasileiro.', area: 'Direito Civil' },
  { latim: 'Sententia facit ius inter partes', traducao: 'A sentença faz lei entre as partes', explicacao: 'A coisa julgada material vincula as partes e seus sucessores quanto à matéria decidida.', area: 'Processo Civil' },
];

const ABREVIATURAS: Abreviatura[] = [
  { sigla: 'a.C.', extensao: 'Antes de Cristo', uso: 'Referência temporal histórica.' },
  { sigla: 'AI', extensao: 'Agravo de Instrumento', uso: 'Recurso contra decisões interlocutórias (art. 1.015, CPC).' },
  { sigla: 'AREsp', extensao: 'Agravo em Recurso Especial', uso: 'Agravo para admissão de REsp no STJ.' },
  { sigla: 'ARE', extensao: 'Agravo em Recurso Extraordinário', uso: 'Agravo para admissão de RE no STF.' },
  { sigla: 'CC', extensao: 'Código Civil', uso: 'Lei nº 10.406/2002.' },
  { sigla: 'CCom', extensao: 'Código Comercial', uso: 'Lei nº 556/1850 (parcialmente revogado).' },
  { sigla: 'CDC', extensao: 'Código de Defesa do Consumidor', uso: 'Lei nº 8.078/1990.' },
  { sigla: 'CF', extensao: 'Constituição Federal', uso: 'CF/1988 — Constituição da República Federativa do Brasil.' },
  { sigla: 'CLT', extensao: 'Consolidação das Leis do Trabalho', uso: 'Decreto-Lei nº 5.452/1943.' },
  { sigla: 'CNJ', extensao: 'Conselho Nacional de Justiça', uso: 'Órgão de controle administrativo e financeiro do Judiciário.' },
  { sigla: 'CP', extensao: 'Código Penal', uso: 'Decreto-Lei nº 2.848/1940.' },
  { sigla: 'CPC', extensao: 'Código de Processo Civil', uso: 'Lei nº 13.105/2015.' },
  { sigla: 'CPP', extensao: 'Código de Processo Penal', uso: 'Decreto-Lei nº 3.689/1941.' },
  { sigla: 'CTN', extensao: 'Código Tributário Nacional', uso: 'Lei nº 5.172/1966.' },
  { sigla: 'DJ', extensao: 'Diário da Justiça', uso: 'Publicação oficial de atos processuais.' },
  { sigla: 'DJe', extensao: 'Diário da Justiça Eletrônico', uso: 'Versão eletrônica do DJ.' },
  { sigla: 'DOU', extensao: 'Diário Oficial da União', uso: 'Publicação oficial de atos federais.' },
  { sigla: 'EC', extensao: 'Emenda Constitucional', uso: 'Alteração formal à Constituição Federal.' },
  { sigla: 'ECA', extensao: 'Estatuto da Criança e do Adolescente', uso: 'Lei nº 8.069/1990.' },
  { sigla: 'LACP', extensao: 'Lei da Ação Civil Pública', uso: 'Lei nº 7.347/1985.' },
  { sigla: 'LDA', extensao: 'Lei de Direitos Autorais', uso: 'Lei nº 9.610/1998.' },
  { sigla: 'LIA', extensao: 'Lei de Improbidade Administrativa', uso: 'Lei nº 8.429/1992, alterada pela Lei nº 14.230/2021.' },
  { sigla: 'LINDB', extensao: 'Lei de Introdução às Normas do Direito Brasileiro', uso: 'Decreto-Lei nº 4.657/1942.' },
  { sigla: 'MS', extensao: 'Mandado de Segurança', uso: 'Ação constitucional (art. 5º, LXIX, CF e Lei nº 12.016/2009).' },
  { sigla: 'OAB', extensao: 'Ordem dos Advogados do Brasil', uso: 'Entidade de classe e fiscalização da advocacia (Lei nº 8.906/1994).' },
  { sigla: 'RE', extensao: 'Recurso Extraordinário', uso: 'Recurso ao STF por violação constitucional.' },
  { sigla: 'REsp', extensao: 'Recurso Especial', uso: 'Recurso ao STJ por violação de lei federal.' },
  { sigla: 'Rel.', extensao: 'Relator(a)', uso: 'Ministro/Desembargador responsável pelo voto no colegiado.' },
  { sigla: 'RHC', extensao: 'Recurso em Habeas Corpus', uso: 'Recurso ao STJ/STF contra acórdão denegatório de HC.' },
  { sigla: 'RISTF', extensao: 'Regimento Interno do STF', uso: 'Normas procedimentais internas do Supremo.' },
  { sigla: 'RMS', extensao: 'Recurso em Mandado de Segurança', uso: 'Recurso ao STJ contra acórdão em MS.' },
  { sigla: 'RTJ', extensao: 'Revista Trimestral de Jurisprudência', uso: 'Publicação oficial do STF.' },
  { sigla: 'STF', extensao: 'Supremo Tribunal Federal', uso: 'Corte constitucional, guardião da CF.' },
  { sigla: 'STJ', extensao: 'Superior Tribunal de Justiça', uso: 'Tribunal da cidadania, uniformizador do direito federal.' },
  { sigla: 'TJ', extensao: 'Tribunal de Justiça', uso: 'Tribunal estadual de 2ª instância.' },
  { sigla: 'TRF', extensao: 'Tribunal Regional Federal', uso: 'Tribunal federal de 2ª instância.' },
  { sigla: 'TRT', extensao: 'Tribunal Regional do Trabalho', uso: 'Tribunal trabalhista de 2ª instância.' },
  { sigla: 'TSE', extensao: 'Tribunal Superior Eleitoral', uso: 'Tribunal superior da Justiça Eleitoral.' },
  { sigla: 'TST', extensao: 'Tribunal Superior do Trabalho', uso: 'Tribunal superior da Justiça do Trabalho.' },
  { sigla: 'v.g.', extensao: 'verbi gratia (por exemplo)', uso: 'Locução latina para introduzir exemplos.' },
  { sigla: 'v.u.', extensao: 'votação unânime', uso: 'Indica que a decisão foi tomada por unanimidade.' },
];

// ─── COMPONENTE PRINCIPAL ────────────────────────────────────────────────────

export default function DicionarioPage() {
  const [tab, setTab] = useState<Tab>('dicionario');
  const [search, setSearch] = useState('');
  const [selectedTermo, setSelectedTermo] = useState<LatimTermo | null>(null);
  const [selectedBrocardo, setSelectedBrocardo] = useState<Brocardo | null>(null);
  const [letraFiltro, setLetraFiltro] = useState('');
  const [areaFiltro, setAreaFiltro] = useState('');

  // Quiz state
  const [quizIdx, setQuizIdx] = useState(0);
  const [quizOpcoes, setQuizOpcoes] = useState<LatimTermo[]>([]);
  const [quizRespondeu, setQuizRespondeu] = useState(false);
  const [quizCerta, setQuizCerta] = useState(false);
  const [quizScore, setQuizScore] = useState({ acertos: 0, total: 0 });
  const [quizTermos, setQuizTermos] = useState<LatimTermo[]>([]);

  const LETRAS = useMemo(() => {
    const ls = new Set(TERMOS.map((t) => t.termo[0].toUpperCase()));
    return Array.from(ls).sort();
  }, []);

  const AREAS = useMemo(() => {
    const as = new Set(TERMOS.filter((t) => t.area).map((t) => t.area!));
    return Array.from(as).sort();
  }, []);

  const termosFiltrados = useMemo(() => {
    return TERMOS.filter((t) => {
      const matchSearch = !search || t.termo.toLowerCase().includes(search.toLowerCase()) || t.traducao.toLowerCase().includes(search.toLowerCase()) || t.definicao.toLowerCase().includes(search.toLowerCase());
      const matchLetra = !letraFiltro || t.termo[0].toUpperCase() === letraFiltro;
      const matchArea = !areaFiltro || t.area === areaFiltro;
      return matchSearch && matchLetra && matchArea;
    });
  }, [search, letraFiltro, areaFiltro]);

  const brocardosFiltrados = useMemo(() => {
    if (!search) return BROCARDOS;
    return BROCARDOS.filter((b) =>
      b.latim.toLowerCase().includes(search.toLowerCase()) ||
      b.traducao.toLowerCase().includes(search.toLowerCase()) ||
      b.explicacao.toLowerCase().includes(search.toLowerCase()),
    );
  }, [search]);

  const abreviaturasFiltradas = useMemo(() => {
    if (!search) return ABREVIATURAS;
    return ABREVIATURAS.filter((a) =>
      a.sigla.toLowerCase().includes(search.toLowerCase()) ||
      a.extensao.toLowerCase().includes(search.toLowerCase()) ||
      a.uso.toLowerCase().includes(search.toLowerCase()),
    );
  }, [search]);

  function iniciarQuiz() {
    const embaralhados = [...TERMOS].sort(() => Math.random() - 0.5).slice(0, 15);
    setQuizTermos(embaralhados);
    setQuizIdx(0);
    setQuizScore({ acertos: 0, total: 0 });
    gerarOpcoes(embaralhados, 0);
    setQuizRespondeu(false);
  }

  function gerarOpcoes(termos: LatimTermo[], idx: number) {
    const correto = termos[idx];
    const outros = TERMOS.filter((t) => t.termo !== correto.termo).sort(() => Math.random() - 0.5).slice(0, 3);
    const opcoes = [...outros, correto].sort(() => Math.random() - 0.5);
    setQuizOpcoes(opcoes);
  }

  function responder(opcao: LatimTermo) {
    if (quizRespondeu) return;
    const certa = opcao.termo === quizTermos[quizIdx].termo;
    setQuizCerta(certa);
    setQuizRespondeu(true);
    setQuizScore((s) => ({ acertos: s.acertos + (certa ? 1 : 0), total: s.total + 1 }));
  }

  function proximaQuestao() {
    const proximo = quizIdx + 1;
    if (proximo >= quizTermos.length) {
      setQuizIdx(quizTermos.length); // fim
    } else {
      setQuizIdx(proximo);
      gerarOpcoes(quizTermos, proximo);
      setQuizRespondeu(false);
    }
  }

  const quizAtual = quizTermos[quizIdx];
  const quizFim = quizIdx >= quizTermos.length;

  return (
    <div className="flex flex-col h-full bg-[#0d0d0d] overflow-hidden">
      {/* Header */}
      <div className="border-b border-white/[0.06] px-6 py-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-amber-500/10 border border-amber-500/20 rounded-xl">
            <BookOpen className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h1 className="text-slate-100 font-semibold">Dicionário Jurídico</h1>
            <p className="text-slate-500 text-xs mt-0.5">Latim jurídico, brocardos, abreviaturas e quiz</p>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar termos, traduções, definições..."
            className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl pl-9 pr-4 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-brand-500/50"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-1">
          {([
            { id: 'dicionario', icon: BookOpen, label: `Dicionário (${TERMOS.length})` },
            { id: 'brocardos', icon: Scroll, label: `Brocardos (${BROCARDOS.length})` },
            { id: 'abreviaturas', icon: BookMarked, label: `Abreviaturas (${ABREVIATURAS.length})` },
            { id: 'quiz', icon: GraduationCap, label: 'Quiz' },
          ] as const).map((t) => (
            <button
              key={t.id}
              onClick={() => { setTab(t.id as Tab); setSearch(''); }}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                tab === t.id
                  ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                  : 'text-slate-500 hover:text-slate-300 hover:bg-white/[0.04]',
              )}
            >
              <t.icon className="w-3.5 h-3.5" />
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ─── ABA: DICIONÁRIO ──────────────────────────────────────────────────── */}
      {tab === 'dicionario' && (
        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar filtros */}
          <div className="w-56 border-r border-white/[0.06] flex flex-col overflow-y-auto shrink-0">
            {/* Filtro área */}
            <div className="p-3 border-b border-white/[0.04]">
              <p className="text-xs text-slate-500 font-medium mb-2">Área</p>
              <div className="space-y-0.5">
                <button
                  onClick={() => setAreaFiltro('')}
                  className={cn('w-full text-left text-xs px-2 py-1 rounded transition-colors', !areaFiltro ? 'text-amber-400 bg-amber-500/10' : 'text-slate-500 hover:text-slate-300 hover:bg-white/[0.04]')}
                >
                  Todas as áreas
                </button>
                {AREAS.map((a) => (
                  <button
                    key={a}
                    onClick={() => setAreaFiltro(areaFiltro === a ? '' : a)}
                    className={cn('w-full text-left text-xs px-2 py-1 rounded transition-colors truncate', areaFiltro === a ? 'text-amber-400 bg-amber-500/10' : 'text-slate-500 hover:text-slate-300 hover:bg-white/[0.04]')}
                  >
                    {a}
                  </button>
                ))}
              </div>
            </div>

            {/* Filtro letra */}
            <div className="p-3">
              <p className="text-xs text-slate-500 font-medium mb-2">Letra</p>
              <div className="flex flex-wrap gap-1">
                <button
                  onClick={() => setLetraFiltro('')}
                  className={cn('text-xs px-1.5 py-0.5 rounded transition-colors', !letraFiltro ? 'text-amber-400 bg-amber-500/10' : 'text-slate-600 hover:text-slate-300 hover:bg-white/[0.04]')}
                >
                  All
                </button>
                {LETRAS.map((l) => (
                  <button
                    key={l}
                    onClick={() => setLetraFiltro(letraFiltro === l ? '' : l)}
                    className={cn('text-xs px-1.5 py-0.5 rounded transition-colors font-mono', letraFiltro === l ? 'text-amber-400 bg-amber-500/10' : 'text-slate-600 hover:text-slate-300 hover:bg-white/[0.04]')}
                  >
                    {l}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Lista + detalhe */}
          <div className="flex flex-1 overflow-hidden">
            {/* Lista */}
            <div className="w-80 border-r border-white/[0.06] overflow-y-auto shrink-0">
              <div className="p-2">
                <p className="text-xs text-slate-600 px-2 py-1">{termosFiltrados.length} termo{termosFiltrados.length !== 1 ? 's' : ''}</p>
                {termosFiltrados.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-40 text-center">
                    <Search className="w-8 h-8 text-slate-700 mb-2" />
                    <p className="text-slate-600 text-xs">Nenhum termo encontrado</p>
                  </div>
                ) : (
                  termosFiltrados.map((t) => (
                    <button
                      key={t.termo}
                      onClick={() => setSelectedTermo(t)}
                      className={cn(
                        'w-full text-left px-3 py-2.5 rounded-lg transition-all',
                        selectedTermo?.termo === t.termo
                          ? 'bg-amber-500/10 border border-amber-500/20'
                          : 'hover:bg-white/[0.04] border border-transparent',
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className={cn('text-sm font-medium truncate', selectedTermo?.termo === t.termo ? 'text-amber-400' : 'text-slate-300')}>
                          {t.termo}
                        </p>
                        {t.area && (
                          <span className="text-[10px] text-slate-600 shrink-0">{t.area?.split(' ')[0]}</span>
                        )}
                      </div>
                      <p className="text-xs text-slate-600 truncate mt-0.5">{t.traducao}</p>
                    </button>
                  ))
                )}
              </div>
            </div>

            {/* Detalhe */}
            <div className="flex-1 overflow-y-auto p-6">
              {!selectedTermo ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <BookOpen className="w-16 h-16 text-slate-800 mb-4" />
                  <p className="text-slate-500 text-sm">Selecione um termo para ver a definição</p>
                  <p className="text-slate-700 text-xs mt-1">{TERMOS.length} termos em latim jurídico</p>
                </div>
              ) : (
                <div className="max-w-2xl space-y-5">
                  <div>
                    <h2 className="text-2xl font-bold text-amber-400 font-serif italic">{selectedTermo.termo}</h2>
                    {selectedTermo.pronuncia && (
                      <p className="text-slate-500 text-xs mt-1">Pronúncia: /{selectedTermo.pronuncia}/</p>
                    )}
                    {selectedTermo.area && (
                      <span className="inline-block mt-2 text-xs px-2 py-0.5 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-full">{selectedTermo.area}</span>
                    )}
                  </div>

                  <div className="p-4 bg-white/[0.02] border border-white/[0.06] rounded-xl">
                    <p className="text-xs text-slate-500 font-medium mb-1">Tradução</p>
                    <p className="text-slate-200 text-base font-medium">{selectedTermo.traducao}</p>
                  </div>

                  <div>
                    <p className="text-xs text-slate-500 font-medium mb-2">Definição</p>
                    <p className="text-slate-300 text-sm leading-relaxed">{selectedTermo.definicao}</p>
                  </div>

                  {selectedTermo.exemplo && (
                    <div className="p-4 bg-brand-600/5 border border-brand-500/20 rounded-xl">
                      <p className="text-xs text-brand-400 font-medium mb-1">Exemplo prático</p>
                      <p className="text-slate-300 text-sm italic">"{selectedTermo.exemplo}"</p>
                    </div>
                  )}

                  <div className="flex justify-end">
                    <button
                      onClick={() => {
                        const idx = TERMOS.indexOf(selectedTermo);
                        const next = TERMOS[(idx + 1) % TERMOS.length];
                        setSelectedTermo(next);
                      }}
                      className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors"
                    >
                      Próximo termo
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── ABA: BROCARDOS ───────────────────────────────────────────────────── */}
      {tab === 'brocardos' && (
        <div className="flex flex-1 overflow-hidden">
          {/* Lista */}
          <div className="w-80 border-r border-white/[0.06] overflow-y-auto shrink-0">
            <div className="p-2">
              <p className="text-xs text-slate-600 px-2 py-1">{brocardosFiltrados.length} brocardo{brocardosFiltrados.length !== 1 ? 's' : ''}</p>
              {brocardosFiltrados.map((b, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedBrocardo(b)}
                  className={cn(
                    'w-full text-left px-3 py-2.5 rounded-lg transition-all',
                    selectedBrocardo?.latim === b.latim
                      ? 'bg-amber-500/10 border border-amber-500/20'
                      : 'hover:bg-white/[0.04] border border-transparent',
                  )}
                >
                  <p className={cn('text-xs font-medium italic truncate', selectedBrocardo?.latim === b.latim ? 'text-amber-400' : 'text-slate-300')}>
                    {b.latim}
                  </p>
                  <p className="text-[11px] text-slate-600 truncate mt-0.5">{b.traducao}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Detalhe brocardo */}
          <div className="flex-1 overflow-y-auto p-6">
            {!selectedBrocardo ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <Quote className="w-16 h-16 text-slate-800 mb-4" />
                <p className="text-slate-500 text-sm">Selecione um brocardo para ver a explicação</p>
                <p className="text-slate-700 text-xs mt-1">Máximas do direito romano que permeiam o ordenamento brasileiro</p>
              </div>
            ) : (
              <div className="max-w-2xl space-y-5">
                <div className="p-5 bg-amber-500/5 border border-amber-500/15 rounded-2xl">
                  <Quote className="w-5 h-5 text-amber-500/50 mb-2" />
                  <p className="text-xl font-serif italic text-amber-300 leading-relaxed">{selectedBrocardo.latim}</p>
                </div>

                {selectedBrocardo.area && (
                  <span className="inline-block text-xs px-2 py-0.5 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-full">{selectedBrocardo.area}</span>
                )}

                <div className="p-4 bg-white/[0.02] border border-white/[0.06] rounded-xl">
                  <p className="text-xs text-slate-500 font-medium mb-1">Tradução</p>
                  <p className="text-slate-200 text-base font-medium">{selectedBrocardo.traducao}</p>
                </div>

                <div>
                  <p className="text-xs text-slate-500 font-medium mb-2">Explicação</p>
                  <p className="text-slate-300 text-sm leading-relaxed">{selectedBrocardo.explicacao}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── ABA: ABREVIATURAS ────────────────────────────────────────────────── */}
      {tab === 'abreviaturas' && (
        <div className="flex-1 overflow-y-auto p-6">
          <p className="text-xs text-slate-600 mb-4">{abreviaturasFiltradas.length} abreviatura{abreviaturasFiltradas.length !== 1 ? 's' : ''}</p>
          <div className="grid grid-cols-1 gap-2 max-w-3xl">
            {abreviaturasFiltradas.map((a) => (
              <div key={a.sigla} className="flex items-start gap-4 p-4 bg-white/[0.02] border border-white/[0.06] hover:border-white/10 rounded-xl transition-colors">
                <div className="shrink-0 w-20 text-center">
                  <span className="text-amber-400 font-bold font-mono text-lg">{a.sigla}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-slate-200 text-sm font-medium">{a.extensao}</p>
                  <p className="text-slate-500 text-xs mt-0.5 leading-relaxed">{a.uso}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── ABA: QUIZ ────────────────────────────────────────────────────────── */}
      {tab === 'quiz' && (
        <div className="flex-1 overflow-y-auto flex items-start justify-center p-6">
          <div className="w-full max-w-lg">
            {quizTermos.length === 0 ? (
              /* Tela inicial */
              <div className="text-center mt-16">
                <div className="inline-flex p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl mb-6">
                  <GraduationCap className="w-10 h-10 text-amber-400" />
                </div>
                <h2 className="text-slate-100 text-xl font-semibold mb-2">Quiz de Latim Jurídico</h2>
                <p className="text-slate-500 text-sm mb-2">Teste seus conhecimentos sobre terminologia latina.</p>
                <p className="text-slate-600 text-xs mb-8">15 questões · Você verá uma definição e deverá identificar o termo correto.</p>
                <button
                  onClick={iniciarQuiz}
                  className="flex items-center gap-2 px-6 py-3 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-400 rounded-xl transition-colors mx-auto font-medium"
                >
                  <Shuffle className="w-4 h-4" />
                  Começar Quiz
                </button>
              </div>
            ) : quizFim ? (
              /* Resultado final */
              <div className="text-center mt-12">
                <div className={cn('inline-flex p-4 rounded-2xl mb-6', quizScore.acertos >= 10 ? 'bg-emerald-500/10 border border-emerald-500/20' : quizScore.acertos >= 6 ? 'bg-yellow-500/10 border border-yellow-500/20' : 'bg-red-500/10 border border-red-500/20')}>
                  <GraduationCap className={cn('w-10 h-10', quizScore.acertos >= 10 ? 'text-emerald-400' : quizScore.acertos >= 6 ? 'text-yellow-400' : 'text-red-400')} />
                </div>
                <h2 className="text-slate-100 text-xl font-semibold mb-2">
                  {quizScore.acertos >= 10 ? 'Excelente!' : quizScore.acertos >= 6 ? 'Bom trabalho!' : 'Continue praticando!'}
                </h2>
                <p className={cn('text-4xl font-bold mb-2', quizScore.acertos >= 10 ? 'text-emerald-400' : quizScore.acertos >= 6 ? 'text-yellow-400' : 'text-red-400')}>
                  {quizScore.acertos}/{quizScore.total}
                </p>
                <p className="text-slate-500 text-sm mb-8">
                  {Math.round((quizScore.acertos / quizScore.total) * 100)}% de aproveitamento
                </p>
                <button
                  onClick={iniciarQuiz}
                  className="flex items-center gap-2 px-6 py-3 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-400 rounded-xl transition-colors mx-auto"
                >
                  <RotateCcw className="w-4 h-4" />
                  Jogar novamente
                </button>
              </div>
            ) : (
              /* Questão */
              <div className="space-y-6">
                {/* Progress */}
                <div>
                  <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
                    <span>Questão {quizIdx + 1} de {quizTermos.length}</span>
                    <span className="text-emerald-400">{quizScore.acertos} acerto{quizScore.acertos !== 1 ? 's' : ''}</span>
                  </div>
                  <div className="h-1.5 bg-white/[0.05] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-amber-500/60 rounded-full transition-all duration-300"
                      style={{ width: `${((quizIdx) / quizTermos.length) * 100}%` }}
                    />
                  </div>
                </div>

                {/* Pergunta */}
                <div className="p-5 bg-white/[0.02] border border-white/[0.08] rounded-2xl">
                  <p className="text-xs text-slate-500 font-medium mb-3">Qual é o termo em latim para esta definição?</p>
                  <p className="text-slate-200 text-sm leading-relaxed">{quizAtual?.definicao}</p>
                  {quizAtual?.area && (
                    <span className="inline-block mt-3 text-[10px] px-2 py-0.5 bg-white/[0.04] text-slate-600 rounded-full">{quizAtual.area}</span>
                  )}
                </div>

                {/* Opções */}
                <div className="space-y-2">
                  {quizOpcoes.map((opcao) => {
                    const isCerta = opcao.termo === quizAtual?.termo;
                    const foiClicada = quizRespondeu && !quizCerta && !isCerta; // errada clicada — não sabemos qual foi
                    return (
                      <button
                        key={opcao.termo}
                        onClick={() => responder(opcao)}
                        disabled={quizRespondeu}
                        className={cn(
                          'w-full text-left p-4 rounded-xl border transition-all',
                          !quizRespondeu && 'hover:border-amber-500/30 hover:bg-amber-500/5 border-white/[0.08] bg-white/[0.02] text-slate-300',
                          quizRespondeu && isCerta && 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300',
                          quizRespondeu && !isCerta && 'border-white/[0.06] bg-white/[0.01] text-slate-600',
                        )}
                      >
                        <div className="flex items-center gap-3">
                          {quizRespondeu && (
                            isCerta
                              ? <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                              : <XCircle className="w-4 h-4 text-slate-600 shrink-0" />
                          )}
                          <div>
                            <p className={cn('text-sm font-medium italic', quizRespondeu && isCerta ? 'text-emerald-300' : !quizRespondeu ? 'text-slate-200' : 'text-slate-600')}>{opcao.termo}</p>
                            {quizRespondeu && <p className={cn('text-xs mt-0.5', isCerta ? 'text-emerald-400/70' : 'text-slate-700')}>{opcao.traducao}</p>}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {quizRespondeu && (
                  <div className="space-y-3">
                    <div className={cn('p-3 rounded-xl text-sm', quizCerta ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-300' : 'bg-red-500/10 border border-red-500/20 text-red-300')}>
                      {quizCerta ? '✓ Correto!' : `✗ Incorreto. O termo correto é: "${quizAtual?.termo}"`}
                    </div>
                    <button
                      onClick={proximaQuestao}
                      className="w-full py-2.5 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-400 rounded-xl transition-colors text-sm font-medium"
                    >
                      {quizIdx + 1 >= quizTermos.length ? 'Ver resultado' : 'Próxima questão →'}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
