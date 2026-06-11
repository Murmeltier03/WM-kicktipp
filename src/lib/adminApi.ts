import type { TournamentState } from "../types";

const passwordKey = "wm-kicktipp-admin-password";

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
    body: JSON.stringify({ password }),
  });

  if (!response.ok) {
    throw new Error("Passwort stimmt nicht.");
  }

  sessionStorage.setItem(passwordKey, password);
}

export async function loadAdminState(): Promise<TournamentState> {
  const response = await fetch("/api/admin-state", {
    headers: { "x-admin-password": getStoredPassword() },
  });

  if (!response.ok) {
    throw new Error("Admin-Daten konnten nicht geladen werden.");
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
    throw new Error("Speichern fehlgeschlagen.");
  }

  return response.json();
}
