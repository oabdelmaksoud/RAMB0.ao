/// <reference types="react" />
/// <reference types="react-dom" />

declare module 'lucide-react' {
  import { ComponentType, SVGAttributes } from 'react';

  export type LucideIcon = ComponentType<SVGAttributes<SVGElement>>;

  export const Code2: LucideIcon;
  export const FileText: LucideIcon;
  export const Bell: LucideIcon;
  export const BarChartBig: LucideIcon;
  export const BrainCircuit: LucideIcon;
  export const ToyBrick: LucideIcon;
  export const SlidersHorizontal: LucideIcon;
  export const Activity: LucideIcon;
  export const AlertTriangle: LucideIcon;
  export const MousePointerSquareDashed: LucideIcon;
  export const Hand: LucideIcon;
  export const X: LucideIcon;
}
