// POST /api/streams/[id]/cancel
// Body: none. Demo identity: userId in query (or body).
// Success response: { txHash, refunded, kept }.
export async function POST() {
  return Response.json({ error: "not implemented" }, { status: 501 });
}
