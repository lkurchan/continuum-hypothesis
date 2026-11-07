# Continuum

Pagos por segundo para freelancers y trabajadores de plataformas, en pesos onchain con ARGt sobre Arbitrum One.

Ver [PRD.md](PRD.md) para alcance, arquitectura e interfaces, y [docs/SETUP.md](docs/SETUP.md) para instalar la base y preparar Supabase y Vercel.

Contrato desplegado en Arbitrum One y backend verificado con ARGt real: creación en lote, top-up, retiro, cancelación con reembolso y retiro del remanente. Supabase conserva metadata e historial y los balances onchain cierran. Ver [evidencia B6](docs/B6.md). El backend está publicado en [continuum-hypothesis.vercel.app](https://continuum-hypothesis.vercel.app), con acceso protegido y lecturas reales verificadas; la UI completa sigue pendiente de integrar. La [guía de Vercel](docs/VERCEL.md) registra configuración y deployment. ARGt es un medio de pago, **sin rendimiento**.

## Chain, token y contrato

| Recurso | Dirección / evidencia |
|---|---|
| Red | Arbitrum One, chainId `42161` |
| ARGt (18 decimales) | [`0x59863989d080B22476DB95656d0C3CC18be92214`](https://arbiscan.io/token/0x59863989d080B22476DB95656d0C3CC18be92214) |
| ContinuumStreams | [`0xB98D30CC1e8D234A6234569848366fE30F3fF799`](https://arbiscan.io/address/0xB98D30CC1e8D234A6234569848366fE30F3fF799#code) |
| Deploy, bloque 522100998 | [`0x9bea…bc6b`](https://arbiscan.io/tx/0x9bea2cb4b05d7be7d3fc3d53db78126c005eb03e40eb1fadf10b46d63c37bc6b) |
| Lote real: streams 1 y 2 | [0x9f2f…0dc2](https://arbiscan.io/tx/0x9f2f71b543d3cbfb9a2c62da8049264da1d9226ed1026039d255fe699e520dc2) |
| Primer retiro real: 0,1 ARGt | [0x074c…8328](https://arbiscan.io/tx/0x074c1daf4a25ed0369a566bdbe497662ff7d238d9890a11730a7abfeaf3f8328) |

## Correr la demo

```bash
nvm use
npm ci --prefix web
cp web/.env.example web/.env.local # solo si todavía no existe
CHAIN_MODE=mock npm run dev --prefix web
```

El backend mock incluye tres usuarios y dos streams en memoria; no necesita claves ni servicios. Las pantallas `/payer` y `/worker` siguen en desarrollo. Los hashes `mock:` representan simulaciones y no tienen enlace a Arbiscan. Reiniciar el proceso restaura el seed.

Para preparar el modo real, ver [OPERATIONS.md](docs/OPERATIONS.md): diagnóstico de solo lectura, configuración de wallets demo y seed por API que registra blockchain e historial. No subir `.env.local`, `.env` ni claves al repositorio.

## Arquitectura y verificación

Next.js expone rutas HTTP que usan `StreamService`, un repositorio Supabase y un `StreamGateway`. La implementación real firma con viem en el servidor; la mock permite una demo local. Solidity controla permisos, vesting lineal, fondeo, retiros y cancelaciones. Los montos se transmiten como strings de hasta 18 decimales.

```bash
npm test --prefix web
npm run lint --prefix web
npm run typecheck --prefix web
npm run build --prefix web
npm run test:api --prefix web
bash contracts/script/install-deps.sh
forge test --root contracts --no-match-path 'test/*.fork.t.sol'
npm run test:chain --prefix web
```

El [CI](docs/CI.md) comprueba backend/build, HTTP mock, contratos/ABI, Anvil y PostgreSQL. Ver [integración de API](docs/BACKEND.md) e [informe de revisión A+B](docs/reviews/2026-11-07-ab.md).

El historial del evento registra scaffold, contrato, gateways, dominio, API, migraciones, tests, revisión y herramientas operativas en commits separados. El selector de usuario y las wallets custodiales son de demo: no hay autenticación de producción, exclusión distribuida ni reconciliación automática entre chain y SQL. Si una operación se confirma y falla el historial, conservar el hash y reconciliarlo antes de repetir.
