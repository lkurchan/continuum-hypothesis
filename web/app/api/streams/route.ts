import { withDemoAuth } from "@/lib/auth/guard";
import { normalizeAmount } from "@/lib/domain/amounts";
import { requireCondition } from "@/lib/domain/errors";
import { body, object, respond, textField, userId } from "@/lib/domain/http";

async function handleGET(request: Request) {
  return respond(({ service }) => service.streams(userId(request)));
}

// Body and response follow PRD 8.3; payerId also supplies the demo identity.
async function handlePOST(request: Request) {
  return respond(async ({ service }) => {
    const payload = await body(request);
    const payerId = textField(payload.payerId, "payerId");
    requireCondition(Array.isArray(payload.items) && payload.items.length > 0 && payload.items.length <= 100, "Se requieren entre 1 y 100 items.");
    requireCondition(typeof payload.start === "number" && typeof payload.end === "number", "start y end deben ser segundos Unix.");
    const items = payload.items.map(value => {
      const item = object(value);
      requireCondition(item.label === undefined || (typeof item.label === "string" && item.label.length <= 80), "label debe ser un texto de hasta 80 caracteres.");
      return { workerId: textField(item.workerId, "workerId"), totalAmount: normalizeAmount(item.totalAmount), initialDeposit: normalizeAmount(item.initialDeposit),
        ...(typeof item.label === "string" && item.label.trim() ? { label: item.label } : {}) };
    });
    return service.create({ payerId, items, start: payload.start, end: payload.end }, userId(request, payload, payerId));
  }, 201);
}

export const GET = withDemoAuth(handleGET);
export const POST = withDemoAuth(handlePOST);
