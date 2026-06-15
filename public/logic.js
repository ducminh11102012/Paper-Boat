// logic.js — required by the apps platform. Paper Boats is a solo, client-side
// narrative game, so the rules module is the canonical no-op stub.
export const meta = { game: "paper-boats", minPlayers: 1, maxPlayers: 1 };
export function setup() { return {}; }
export function validateAction() { return { ok: true }; }
export function applyAction(state) { return state; }
export function isGameOver() { return { over: false }; }
export function viewFor(state) { return state; }
