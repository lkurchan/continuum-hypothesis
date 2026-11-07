// POST /api/streams/[id]/withdraw
// Body: { amount, destination: 'wallet' | 'belo' }.
// Demo identity: userId in body or query. Success response: { txHash }.
export async function POST() {
  return Response.json({ error: "not implemented" }, { status: 501 });
}
