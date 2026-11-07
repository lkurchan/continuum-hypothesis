# Plan: destino Belo de la demo

1. Probar en el servicio que los dos usuarios demo muestran el destino fijado y lo envían al gateway al elegir Belo, sin alterar el retiro a su wallet.
2. Centralizar el override de destino en la resolución de usuarios del servicio; evitar modificaciones a la API y a Supabase.
3. Ejecutar tests, lint y build; comprobar la UI y el destino mediante lecturas, sin transferir fondos.
4. Integrar por PR y verificar el deployment de producción.
