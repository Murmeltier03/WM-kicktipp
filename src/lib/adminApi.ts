import type { TournamentState } from "../types";

export type PointRestoreStatus = {
  status: "ready" | "complete" | "blocked";
  rowCount: number;
  totalPoints: number;
  expectedRows: number;
  expectedPoints: number;
};

const passwordKey = "wm-kicktipp-admin-password";

async function extractApiMessage(response: Response, fallback: string) {
  try {
    const text = await response.text();
    if (!text) return fallback;

    try {
      const parsed = JSON.parse(text) as { error?: string; message?: string };
      return parsed.error ?? parsed.message ?? text;
    } catch {
      return text;
    }
  } catch {
    return fallback;
  }
}

export function getStoredPassword(): string {
  return sessionStorage.getItem(passwordKey) ?? "";
}

export function clearStoredPassword() {
  sessionStorage.removeItem(passwordKey);
}

export async function loginAdmin(password: string): Promise<void> {
  const normalizedPassword = password.trim();
  const response = await fetch("/api/admin-login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password: normalizedPassword }),
  });

  if (!response.ok) {
    const message = await extractApiMessage(response, "Passwort stimmt nicht.");
    throw new Error(message);
  }

  sessionStorage.setItem(passwordKey, normalizedPassword);
}

export async function loadAdminState(): Promise<TournamentState> {
  const response = await fetch("/api/admin-state", {
    headers: { "x-admin-password": getStoredPassword() },
  });

  if (!response.ok) {
    const message = await extractApiMessage(response, "Admin-Daten konnten nicht geladen werden.");
    throw new Error(message);
  }

  return response.json();
}

export async function saveAdminState(state: TournamentState): Promise<TournamentState> {
  const response = await fetch("/api/admin-state", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-admin-password": getStoredPassword(),
    },
    body: JSON.stringify(state),
  });

  if (!response.ok) {
    const message = await extractApiMessage(response, "Speichern fehlgeschlagen.");
    throw new Error(message);
  }

  return response.json();
}

export async function loadPointRestoreStatus(): Promise<PointRestoreStatus> {
  const response = await fetch("/api/restore-points", {
    headers: { "x-admin-password": getStoredPassword() },
  });

  if (!response.ok) {
    const message = await extractApiMessage(response, "Wiederherstellungsstatus konnte nicht geladen werden.");
    throw new Error(message);
  }

  return response.json();
}

export async function restoreTournamentPoints(): Promise<PointRestoreStatus> {
  const response = await fetch("/api/restore-points", {
    method: "POST",
    headers: { "x-admin-password": getStoredPassword() },
  });

  if (!response.ok) {
    const message = await extractApiMessage(response, "Punkte konnten nicht wiederhergestellt werden.");
    throw new Error(message);
  }

  return response.json();
}
