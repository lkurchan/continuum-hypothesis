// POST /api/streams/[id]/topup
// Body: { amount }. Demo identity: userId in body or query.
// Success response: { txHash }.
export async function POST() {
  return Response.json({ error: "not implemented" }, { status: 501 });
}
