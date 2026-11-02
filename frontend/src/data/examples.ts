import { graphToText } from '../domain/parser';
import { HK_GRAPH_PAYLOAD } from './hongKongGraph';

export interface Example {
  id: string;
  label: string;
  text: string;
  direcionado: boolean;
  ponderado: boolean;
}

export const PROPOSAL_TEXT = graphToText({ ...HK_GRAPH_PAYLOAD, ponderado: true }, 'Grafo da proposta: origem destino peso');

export const EXAMPLES: Example[] = [
  { id: 'proposta', label: 'Grafo da proposta', text: PROPOSAL_TEXT, direcionado: false, ponderado: true },
  {
    id: 'direcionado',
    label: 'Exemplo direcionado',
    direcionado: true,
    ponderado: true,
    text: `# Vias de mão única: origem destino peso
A B 4
A C 2
C B 1
B D 5
C D 8
C E 10
D E 2
E F 3
D F 6
F A 7
`,
  },
  {
    id: 'desconexo',
    label: 'Grafo desconexo',
    direcionado: false,
    ponderado: true,
    text: `# Duas ilhas e um bairro isolado
A B 3
A C 1
B C 7
C D 2
X Y 4
Y Z 1
V: W
`,
  },
];
