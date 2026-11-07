# Integración y freeze (14:30–15:00, todos)

| Hora | Qué | Quién |
|---|---|---|
| 14:30 | Rebase de todas las branches del P0 sobre `main` y merge en el orden del `00-README.md` | Cada dueño de su PR |
| 14:35 | Deploy a Vercel de `main` y chequeo de que `TREASURY_ADDRESS` esté cargada | B |
| 14:40 | **Prueba de punta a punta en mainnet** (pasos abajo) | B + C + D mirando |
| 14:45 | Corte: lo que no está en `main` queda afuera | Todos |
| 14:50 | Probar `CHAIN_MODE=mock` como salida de emergencia de la demo | D |
| 15:00 | **Freeze.** Desde acá solo bugs, copy, README y ensayo | Todos |

## Prueba de punta a punta (14:40)

1. **Cliente:** crear el acuerdo "Logística de última milla" con el primer tramo y verificar en Arbiscan el **depósito y la comisión**.
2. **Cliente:** fondear un segundo tramo. Verificar el depósito y la comisión, y que "Cubierto hasta" avance.
3. **Proveedor:** ver el contador corriendo y cobrar una parte a la wallet o a Belo. Verificar el retiro en Arbiscan.
4. Verificar que el acuerdo atrasado del seed muestre "Atrasado" en las dos vistas.
5. **Pasarle a Codex 2 los 4 hashes** (creación, tramo, comisión y cobro) para el README.

Si algo falla en el paso 1 o 2 con la fee: la fee no bloquea, así que tiene que quedar "fee pendiente" en la actividad. Se anota y se sigue. **No se toca el contrato.**
