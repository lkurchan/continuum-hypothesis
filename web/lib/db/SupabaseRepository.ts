import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { normalizeAmount } from "@/lib/domain/amounts";
import { DomainError, requireCondition } from "@/lib/domain/errors";
import type { Activity, DemoUser } from "@/lib/domain/types";
import type { Repository, StreamRecord } from "./Repository";

type UserRow = { id: string; name: string; role: DemoUser["role"]; address: DemoUser["address"]; belo_address: DemoUser["beloAddress"] | null; avatar_url: string | null };
type StreamRow = { id: string; payer_id: string; worker_id: string; label: string | null; created_tx: string; created_at: string };
type ActivityRow = { id: string; stream_id: string; kind: Activity["kind"]; amount: string; tx_hash: string; user_id: string; note: string | null; created_at: string };
const userColumns = "id,name,role,address,belo_address,avatar_url";
const streamColumns = "id,payer_id,worker_id,label,created_tx,created_at";
// Cast on the server before JSON serialization; numeric JSON would lose precision.
const activityColumns = "id,stream_id,kind,amount::text,tx_hash,user_id,note,created_at";
const userView = (r: UserRow): DemoUser => ({ id: r.id, name: r.name, role: r.role, address: r.address,
  ...(r.belo_address ? { beloAddress: r.belo_address } : {}), ...(r.avatar_url ? { avatarUrl: r.avatar_url } : {}) });
const streamView = (r: StreamRow): StreamRecord => ({ id: r.id, payerId: r.payer_id, workerId: r.worker_id,
  ...(r.label ? { label: r.label } : {}), createdTx: r.created_tx, createdAt: r.created_at });
const activityRow = (a: Activity) => ({ id: a.id, stream_id: a.streamId, kind: a.kind, amount: a.amount,
  tx_hash: a.txHash, user_id: a.userId, note: a.note ?? null, created_at: a.createdAt });

export class SupabaseRepository implements Repository {
  constructor(private readonly client: SupabaseClient) {}
  static fromEnv() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    requireCondition(url && key && /^https:\/\//.test(url), "Falta configurar Supabase en el servidor.", 503);
    return new SupabaseRepository(createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } }));
  }
  private check(error: unknown): void { if (error) throw new DomainError("No se pudo acceder a la base de datos.", 503); }
  async users() {
    const { data, error } = await this.client.from("users").select(userColumns).order("id").returns<UserRow[]>();
    this.check(error);
    return (data ?? []).map(userView);
  }
  async user(id: string) {
    const { data, error } = await this.client.from("users").select(userColumns).eq("id", id).maybeSingle<UserRow>();
    this.check(error);
    return data ? userView(data) : null;
  }
  async streams(userId: string) {
    requireCondition(/^[a-zA-Z0-9_-]{1,64}$/.test(userId), "Identificador de usuario inválido.");
    const { data, error } = await this.client.from("streams").select(streamColumns)
      .or(`payer_id.eq.${userId},worker_id.eq.${userId}`).order("created_at").returns<StreamRow[]>();
    this.check(error);
    return (data ?? []).map(streamView);
  }
  async stream(id: string) {
    const { data, error } = await this.client.from("streams").select(streamColumns).eq("id", id).maybeSingle<StreamRow>();
    this.check(error);
    return data ? streamView(data) : null;
  }
  async recordCreation(streams: StreamRecord[], activity: Activity[]) {
    const { error } = await this.client.rpc("record_stream_creation", {
      p_streams: streams.map(s => ({ id: s.id, payer_id: s.payerId, worker_id: s.workerId, label: s.label ?? null,
        created_tx: s.createdTx, created_at: s.createdAt })),
      p_activity: activity.map(activityRow),
    });
    this.check(error);
  }
  async recordActivity(activity: Activity) {
    const { error } = await this.client.from("activity").insert(activityRow(activity));
    this.check(error);
  }
  async activity(userId: string): Promise<Activity[]> {
    const streams = await this.streams(userId);
    if (!streams.length) return [];
    const { data, error } = await this.client.from("activity").select(activityColumns)
      .in("stream_id", streams.map(s => s.id)).order("created_at", { ascending: false }).returns<ActivityRow[]>();
    this.check(error);
    return (data ?? []).map(r => ({ id: r.id, streamId: r.stream_id, kind: r.kind, amount: normalizeAmount(r.amount),
      txHash: r.tx_hash, explorerUrl: r.tx_hash ? `https://arbiscan.io/tx/${r.tx_hash}` : "", userId: r.user_id, createdAt: r.created_at,
      ...(r.note ? { note: r.note } : {}) }));
  }
}
