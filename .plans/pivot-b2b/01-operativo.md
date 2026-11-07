# Operativo — tesorería y fondos (lo hace cualquiera, ya)

Sin esto, la fee no se puede probar en mainnet. No hay código.

1. **Crear la wallet de tesorería** (Arbitrum One). Solo recibe fees, así que no necesita ETH ni clave en el server.
   - `cast wallet new` desde `contracts/`, o cualquier wallet.
   - Guardar la clave privada fuera del repo. Al server solo le hace falta la **dirección**.
2. **Cargar `TREASURY_ADDRESS`**:
   - en Vercel (Production y Preview);
   - en el `web/.env.local` de quien tenga B;
   - avisarle a Codex 2 la dirección para el README.
3. **Verificar los saldos del cliente demo** (`DEMO_PK_PLATFORM`):
   - **ARGt:** tiene que cubrir los tramos de la demo **más el 0,05%**.
   - **ETH en Arbitrum:** ahora cada depósito son 2 transacciones (depósito y fee), así que hace falta más gas.
4. Avisar en el grupo cuando esté listo: "Tesorería `0x…` cargada en Vercel".
