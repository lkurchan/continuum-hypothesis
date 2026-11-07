import { monthProgress } from "./cover";

// Display-only contracts: deliberately separate from StreamView and transaction inputs.
type PresentationContract = { name: string; service: string; monthly: number };
const incoming: PresentationContract[] = [
  { name: "Estudio Norte", service: "Desarrollo de producto", monthly: 2_400_000 },
  { name: "Órbita Digital", service: "Soporte y mantenimiento", monthly: 1_800_000 },
  { name: "Mercado Sur", service: "Consultoría técnica", monthly: 960_000 },
];
const outgoing: PresentationContract[] = [
  { name: "Forma Studio", service: "Diseño de producto", monthly: 900_000 },
  { name: "Nube Labs", service: "Infraestructura y soporte", monthly: 600_000 },
];

export function presentationAt(nowSec: number) {
  const { elapsed, length } = monthProgress(new Date(nowSec * 1000));
  const progress = elapsed / length;
  const rows = (contracts: PresentationContract[]) => contracts.map(c => ({ ...c, earned: c.monthly * progress }));
  const total = (contracts: PresentationContract[]) => contracts.reduce((sum, c) => sum + c.monthly, 0);
  return {
    incoming: rows(incoming), outgoing: rows(outgoing), progress,
    earned: total(incoming) * progress, paid: total(outgoing) * progress,
    inRate: total(incoming) / length, outRate: total(outgoing) / length,
  };
}
