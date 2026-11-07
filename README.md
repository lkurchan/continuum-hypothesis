# Continuum

Pagos por segundo para freelancers y trabajadores de plataformas, en pesos onchain con ARGt sobre Arbitrum One.

Ver [PRD.md](PRD.md) para alcance, arquitectura e interfaces, y [docs/SETUP.md](docs/SETUP.md) para instalar la base y preparar Supabase y Vercel.

Estado: contrato y backend integrados y probados en Anvil local; backend demo funcional con `CHAIN_MODE=mock`. Ver [docs/BACKEND.md](docs/BACKEND.md), [CI](docs/CI.md) e [informe de revisión A+B](docs/reviews/2026-11-07-ab.md). Las UIs siguen en sus módulos. El modo real requiere el despliegue del contrato y la configuración de servicios. ARGt es un medio de pago, sin rendimiento.
