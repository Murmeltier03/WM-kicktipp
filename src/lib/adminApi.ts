import type { TournamentState } from "../types";

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
  const response = await fetch("/api/admin-login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password: password.trim() }),
  });

  if (!response.ok) {
    const message = await extractApiMessage(response, "Passwort stimmt nicht.");
    throw new Error(message);
  }

  sessionStorage.setItem(passwordKey, password);
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
