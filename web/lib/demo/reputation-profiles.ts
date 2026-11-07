// Fictional profiles for the presentation companies only. Never used for real client IDs.
export const reputationProfiles: Record<string, {
  rating: string; contracts: number; onTime: string;
  reviews: { author: string; service: string; text: string }[];
}> = {
  "Estudio Norte": {
    rating: "4,9", contracts: 24, onTime: "100%",
    reviews: [
      { author: "Taller Sur", service: "Diseño de marca", text: "Los pagos llegaron en las fechas acordadas. Siempre supimos cuándo iba a estar disponible el dinero." },
      { author: "Lima Desarrollo", service: "Desarrollo web", text: "Buena comunicación y depósitos completos desde el inicio. Volveríamos a trabajar juntos." },
    ],
  },
  "Órbita Digital": {
    rating: "4,8", contracts: 18, onTime: "96%",
    reviews: [
      { author: "Casa Pixel", service: "Diseño de interfaces", text: "Trabajamos por etapas y depositaron cada parte antes de empezar. Todo muy claro." },
      { author: "Sur Tecnología", service: "Soporte técnico", text: "Resolvieron rápido una demora y mantuvieron una buena comunicación durante el proyecto." },
    ],
  },
  "Mercado Sur": {
    rating: "4,7", contracts: 12, onTime: "94%",
    reviews: [
      { author: "Punto Estudio", service: "Consultoría", text: "Se respetaron los importes acordados y pudimos retirar a medida que avanzaba el trabajo." },
      { author: "Brisa Sistemas", service: "Integración de sistemas", text: "Tuvimos un ajuste en las fechas, pero lo avisaron a tiempo y completaron todos los pagos." },
    ],
  },
};
