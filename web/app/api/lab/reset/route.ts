import { withDemoAuth } from "@/lib/auth/guard";
import { resetMockBackend } from "@/lib/db/runtime";

// Internal lab endpoint: reseeds the in-memory demo. Real mode never resets anything.
async function handlePOST() {
  const reset = resetMockBackend();
  return Response.json(reset ? { reset: true } : { error: "Solo disponible en modo mock." },
    { status: reset ? 200 : 404, headers: { "Cache-Control": "no-store" } });
}

export const POST = withDemoAuth(handlePOST);
