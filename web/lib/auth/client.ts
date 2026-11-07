"use client";

/** A fresh navigation drops account state; never replay a failed payment. */
export function redirectToLogin() {
  const next = window.location.pathname;
  // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- Discard authenticated account state.
  window.location.assign(`/login?next=${encodeURIComponent(next)}`);
}
