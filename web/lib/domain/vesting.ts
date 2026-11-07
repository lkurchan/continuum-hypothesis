import type { Amount, StreamView } from "./types";

// Module B1: mirror the contract formula without depending on the chain or UI.
export function vestedAt(stream: StreamView, nowSec: number): Amount {
  void stream;
  void nowSec;
  throw new Error("TODO B1");
}
