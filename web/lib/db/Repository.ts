import type { Activity, DemoUser } from "@/lib/domain/types";

export interface StreamRecord {
  id: string;
  payerId: string;
  workerId: string;
  label?: string;
  createdTx: string;
  createdAt: string;
}

export interface Repository {
  users(): Promise<DemoUser[]>;
  user(id: string): Promise<DemoUser | null>;
  streams(userId: string): Promise<StreamRecord[]>;
  stream(id: string): Promise<StreamRecord | null>;
  recordCreation(streams: StreamRecord[], activity: Activity[]): Promise<void>;
  recordActivity(activity: Activity): Promise<void>;
  activity(userId: string): Promise<Activity[]>;
}
