import { useEffect, useMemo, useState } from "react";
import { kicktippGroups } from "./data/schedule";
import { clearStoredPassword, getStoredPassword, loadAdminState, loginAdmin, saveAdminState } from "./lib/adminApi";
import { calculateLeaderboard, resizePlayers } from "./lib/points";
import { isSupabaseConfigured, loadPublicState } from "./lib/supabase";
import type { Player, TournamentState } from "./types";

const kicktippDays = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const wmDays = [1, 2, 3] as const;

function App() {
  const [activeView, setActiveView] = useState<"table" | "schedule" | "admin">("table");
  const [state, setState] = useState<TournamentState | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadPublicState()
      .then(setState)
      .finally(() => setIsLoading(false));
  }, []);

  const leaderboard = useMemo(() => calculateLeaderboard(state?.players ?? []), [state]);

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="#top" aria-label="WM Kicktipp Start">
          <span className="brand-mark">WM</span>
          <span>Kicktipp</span>
        </a>
        <nav className="nav-tabs" aria-label="Hauptnavigation">
          <button className={activeView === "table" ? "active" : ""} onClick={() => setActiveView("table")}>
            Tabelle
          </button>
          <button className={activeView === "schedule" ? "active" : ""} onClick={() => setActiveView("schedule")}>
            Spielplan
          </button>
          <button className={activeView === "admin" ? "active" : ""} onClick={() => setActiveView("admin")}>
            Admin
          </button>
        </nav>
        <div className="flag-stripe" aria-hidden="true" />
      </header>

      <main id="top" className="workspace">
        <section className="page-heading">
          <img className="hero-ball" src="/assets/trionda-ball-mobile.jpg" alt="" aria-hidden="true" />
          <div className="flag-glow" aria-hidden="true" />
          <div>
            <span className="hero-kicker">Deutschland-Tippspiel</span>
            <h1>{state?.tournament.name ?? "WM 2026"}</h1>
            <p>
              Punkte fuer deine Kicktipp-Runde, automatisch zusammengefasst aus KT 1-3, KT 4-6 und KT 7-10.
            </p>
          </div>
          <div className="status-strip" aria-label="Datenstatus">
            <span className={isSupabaseConfigured ? "status-dot live" : "status-dot demo"} />
            {isSupabaseConfigured ? "Supabase verbunden" : "Demo-Daten"}
          </div>
        </section>

        {isLoading && <div className="notice">Lade Tabelle...</div>}
        {!isLoading && state && activeView === "table" && <Leaderboard rows={leaderboard} />}
        {!isLoading && activeView === "schedule" && <ScheduleView />}
        {!isLoading && state && activeView === "admin" && (
          <AdminPanel
            publicState={state}
            onSaved={(nextState) => {
              setState(nextState);
              setActiveView("table");
            }}
          />
        )}
      </main>
    </div>
  );
}

function Leaderboard({ rows }: { rows: ReturnType<typeof calculateLeaderboard> }) {
  return (
    <div className="layout-grid">
      <section className="panel leaderboard-panel">
        <div className="section-title">
          <h2>Rangliste</h2>
          <span>{rows.length} Spieler</span>
        </div>
        <div className="leaderboard-list">
          {rows.map((row) => (
            <article className="leaderboard-row" key={row.id}>
              <div className="rank-badge">{row.rank}</div>
              <div className="player-summary">
                <strong>{row.name}</strong>
                <div className="matchday-chips" aria-label={`WM-Spieltag Punkte fuer ${row.name}`}>
                  {wmDays.map((day) => (
                    <span className="score-chip" key={day}>
                      ST {day}
                      <b>{row.wmPoints[day]}</b>
                    </span>
                  ))}
                </div>
              </div>
              <div className="total-score">
                <span>Gesamt</span>
                <strong>{row.total}</strong>
              </div>
            </article>
          ))}
        </div>
      </section>

      <aside className="panel mapping-panel">
        <div className="section-title">
          <h2>Mapping</h2>
          <span>automatisch</span>
        </div>
        <div className="mapping-list">
          <MappingRow wmDay={1} kicktipp="1-3" />
          <MappingRow wmDay={2} kicktipp="4-6" />
          <MappingRow wmDay={3} kicktipp="7-10" />
        </div>
      </aside>
    </div>
  );
}

function MappingRow({ wmDay, kicktipp }: { wmDay: number; kicktipp: string }) {
  return (
    <div className="mapping-row">
      <div>
        <strong>WM Spieltag {wmDay}</strong>
        <span>Kicktipp {kicktipp}</span>
      </div>
      <span className="arrow-icon" aria-hidden="true">
        -&gt;
      </span>
    </div>
  );
}

function ScheduleView() {
  const [selectedWmDay, setSelectedWmDay] = useState<1 | 2 | 3>(1);
  const visibleGroups = kicktippGroups.filter((group) => group.wmMatchday === selectedWmDay);

  return (
    <section className="panel">
      <div className="section-title">
        <h2>Spielplan</h2>
        <div className="segmented-control" aria-label="WM-Spieltag auswaehlen">
          {wmDays.map((day) => (
            <button
              key={day}
              className={selectedWmDay === day ? "active" : ""}
              onClick={() => setSelectedWmDay(day)}
            >
              WM {day}
            </button>
          ))}
        </div>
      </div>

      <div className="schedule-days">
        {visibleGroups.map((group) => (
          <div className="schedule-block" key={group.kicktippMatchday}>
            <div className="schedule-block-header">
              <strong>Kicktipp-Spieltag {group.kicktippMatchday}</strong>
              <span>{group.matches.length} Spiele</span>
            </div>
            <div className="table-scroll">
              <table className="schedule-table">
                <thead>
                  <tr>
                    <th>Termin</th>
                    <th>Heim</th>
                    <th>Gast</th>
                    <th>Gruppe</th>
                  </tr>
                </thead>
                <tbody>
                  {group.matches.map((match) => (
                    <tr key={match.id}>
                      <td>
                        {match.date} {match.time}
                      </td>
                      <td>{match.home}</td>
                      <td>{match.away}</td>
                      <td>Gruppe {match.group}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function AdminPanel({
  publicState,
  onSaved,
}: {
  publicState: TournamentState;
  onSaved: (state: TournamentState) => void;
}) {
  const [password, setPassword] = useState(getStoredPassword());
  const [isLoggedIn, setIsLoggedIn] = useState(Boolean(getStoredPassword()));
  const [draft, setDraft] = useState(publicState);
  const [message, setMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  async function handleLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    try {
      await loginAdmin(password);
      const adminState = await loadAdminState();
      setDraft(adminState);
      setIsLoggedIn(true);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Login fehlgeschlagen.");
    }
  }

  async function handleSave() {
    setIsSaving(true);
    setMessage("");
    try {
      const saved = await saveAdminState(draft);
      onSaved(saved);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Speichern fehlgeschlagen.");
    } finally {
      setIsSaving(false);
    }
  }

  function updatePlayer(playerId: string, updater: (player: Player) => Player) {
    setDraft((current) => ({
      ...current,
      players: current.players.map((player) => (player.id === playerId ? updater(player) : player)),
    }));
  }

  function updatePlayerCount(count: number) {
    const safeCount = Math.max(1, Math.min(50, count || 1));
    setDraft((current) => ({
      ...current,
      tournament: { ...current.tournament, playerCount: safeCount },
      players: resizePlayers(current.players, safeCount),
    }));
  }

  if (!isLoggedIn) {
    return (
      <section className="panel admin-login">
        <div className="section-title">
          <h2>Admin-Login</h2>
          <span>Vercel Passwort</span>
        </div>
        <form className="login-form" onSubmit={handleLogin}>
          <label>
            Passwort
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              required
            />
          </label>
          <button className="primary-button" type="submit">
            Einloggen
          </button>
        </form>
        {message && <p className="form-message error">{message}</p>}
      </section>
    );
  }

  return (
    <section className="panel admin-panel">
      <div className="section-title">
        <h2>Admin-Panel</h2>
        <button
          className="ghost-button"
          onClick={() => {
            clearStoredPassword();
            setIsLoggedIn(false);
          }}
        >
          Abmelden
        </button>
      </div>

      <div className="admin-controls">
        <label>
          Turnier
          <input
            value={draft.tournament.name}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                tournament: { ...current.tournament, name: event.target.value },
              }))
            }
          />
        </label>
        <label>
          Spieleranzahl
          <input
            type="number"
            min="1"
            max="50"
            value={draft.tournament.playerCount}
            onChange={(event) => updatePlayerCount(Number(event.target.value))}
          />
        </label>
      </div>

      <div className="table-scroll">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Spieler</th>
              {kicktippDays.map((day) => (
                <th className="numeric" key={day}>
                  KT {day}
                </th>
              ))}
              <th className="numeric">Gesamt</th>
            </tr>
          </thead>
          <tbody>
            {draft.players.map((player) => {
              const total = kicktippDays.reduce((sum, day) => sum + Number(player.points[day] ?? 0), 0);
              return (
                <tr key={player.id}>
                  <td>
                    <input
                      value={player.name}
                      onChange={(event) => updatePlayer(player.id, (item) => ({ ...item, name: event.target.value }))}
                    />
                  </td>
                  {kicktippDays.map((day) => (
                    <td key={day}>
                      <input
                        className="point-input"
                        type="number"
                        min="0"
                        value={player.points[day] ?? 0}
                        onChange={(event) =>
                          updatePlayer(player.id, (item) => ({
                            ...item,
                            points: { ...item.points, [day]: Number(event.target.value) },
                          }))
                        }
                      />
                    </td>
                  ))}
                  <td className="numeric total">{total}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="admin-actions">
        {message && <p className="form-message error">{message}</p>}
        <button className="primary-button" onClick={handleSave} disabled={isSaving}>
          {isSaving ? "Speichert..." : "Speichern"}
        </button>
      </div>
    </section>
  );
}

export default App;
