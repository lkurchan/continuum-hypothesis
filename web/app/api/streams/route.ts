// GET /api/streams?userId=<id>
// Body: none. Success response: StreamView[] for the payer or worker.
export async function GET() {
  return Response.json({ error: "not implemented" }, { status: 501 });
}

// POST /api/streams
// Body: { payerId, items: [{ workerId, totalAmount, initialDeposit }], start, end }.
// Demo identity: userId in body or query. Success response: { txHash, streamIds }.
export async function POST() {
  return Response.json({ error: "not implemented" }, { status: 501 });
}
