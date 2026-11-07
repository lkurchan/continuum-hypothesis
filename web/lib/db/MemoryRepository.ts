import type { Activity, DemoUser } from "@/lib/domain/types";
import type { Repository, StreamRecord } from "./Repository";

export class MemoryRepository implements Repository {
  private readonly userRows: DemoUser[];
  private readonly streamRows: Map<string, StreamRecord>;
  private readonly activityRows: Activity[];

  constructor(users: DemoUser[], streams: StreamRecord[] = [], activity: Activity[] = []) {
    this.userRows = structuredClone(users);
    this.streamRows = new Map(structuredClone(streams).map(s => [s.id, s]));
    this.activityRows = structuredClone(activity);
  }
  async users() { return structuredClone(this.userRows); }
  async user(id: string) { return structuredClone(this.userRows.find(u => u.id === id) ?? null); }
  async streams(userId: string) {
    return structuredClone([...this.streamRows.values()].filter(s => s.payerId === userId || s.workerId === userId));
  }
  async stream(id: string) { return structuredClone(this.streamRows.get(id) ?? null); }
  async recordCreation(streams: StreamRecord[], activity: Activity[]) {
    for (const stream of streams) this.streamRows.set(stream.id, structuredClone(stream));
    this.activityRows.push(...structuredClone(activity));
  }
  async recordActivity(activity: Activity) { this.activityRows.push(structuredClone(activity)); }
  async activity(userId: string) {
    const ids = new Set((await this.streams(userId)).map(s => s.id));
    return structuredClone(this.activityRows.filter(a => ids.has(a.streamId)).sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
  }
}
