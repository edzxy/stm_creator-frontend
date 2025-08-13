import type { EdgeTypes } from '@xyflow/react';
import CustomEdge from './customEdge';

export const initialEdges = [
  { id: 'e1-2', source: 'a', target: 'b' },
  { id: 'e1-3', source: 'a', target: 'c' },
];

export const edgeTypes = {
  'custom': CustomEdge,
} satisfies EdgeTypes;
