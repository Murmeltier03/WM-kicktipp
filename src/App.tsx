import { useEffect, useMemo, useState } from "react";
import {
  IconArchive,
  IconCalendarWeek,
  IconChevronRight,
  IconMenu2,
  IconSettings,
  IconTrophy,
} from "@tabler/icons-react";
import { kicktippGroups } from "./data/schedule";
import { clearStoredPassword, getStoredPassword, loadAdminState, loginAdmin, saveAdminState } from "./lib/adminApi";
import { calculateLeaderboard, resizePlayers } from "./lib/points";
import { isSupabaseConfigured, loadPublicState } from "./lib/supabase";
import type { Player, TournamentState } from "./types";

const kicktippDays = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const wmDays = [1, 2, 3] as const;

function App() {
  const [activeView, setActiveView] = useState<"table" | "schedule" | "admin">("table");
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [state, setState] = useState<TournamentState | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadPublicState()
      .then(setState)
      .finally(() => setIsLoading(false));
  }, []);

  const leaderboard = useMemo(() => calculateLeaderboard(state?.players ?? []), [state]);
  const changeView = (view: "table" | "schedule" | "admin") => {
    setActiveView(view);
    setIsMenuOpen(false);
  };

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="#top" aria-label="WM Kicktipp Start">
          <span className="brand-mark">WM</span>
          <span>WM Kicktipp</span>
        </a>
        <button
          className="menu-button"
          type="button"
          aria-label="Navigation oeffnen"
          aria-expanded={isMenuOpen}
          onClick={() => setIsMenuOpen((current) => !current)}
        >
          <IconMenu2 size={22} stroke={2.7} />
        </button>
        <div className="flag-stripe" aria-hidden="true" />
        {isMenuOpen && (
          <nav className="menu-sheet" aria-label="Menue">
            <button className={activeView === "table" ? "active" : ""} onClick={() => changeView("table")}>
              Tabelle
            </button>
            <button className={activeView === "schedule" ? "active" : ""} onClick={() => changeView("schedule")}>
              Spielplan
            </button>
            <button className={activeView === "admin" ? "active" : ""} onClick={() => changeView("admin")}>
              Admin
            </button>
          </nav>
        )}
      </header>

      <main id="top" className="workspace">
        <section className="page-heading">
          <img className="hero-ball" src="/assets/trionda-ball-mobile.jpg" alt="" aria-hidden="true" />
          <div className="flag-glow" aria-hidden="true" />
          <div>
            <h1>{state?.tournament.name ?? "WM 2026"}</h1>
            <p>
              Punkteuebersicht der Kicktipp-Runde. Kicktipp-Spieltag 1-3, 4-6 und 7-10 werden automatisch
              zu den echten WM-Gruppenspieltagen zusammengefasst.
            </p>
          </div>
          <div className="status-strip" aria-label="Datenstatus">
            <span className={isSupabaseConfigured ? "status-dot live" : "status-dot demo"} />
            Stand: 11.06.2026, 11:24 Uhr
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

      <nav className="bottom-nav" aria-label="Hauptnavigation unten">
        <BottomNavButton active={activeView === "table"} label="Tabelle" onClick={() => changeView("table")}>
          <IconTrophy size={26} stroke={2.2} />
        </BottomNavButton>
        <BottomNavButton active={activeView === "schedule"} label="Spielplan" onClick={() => changeView("schedule")}>
          <IconCalendarWeek size={26} stroke={2.2} />
        </BottomNavButton>
        <BottomNavButton active={activeView === "admin"} label="Admin" onClick={() => changeView("admin")}>
          <IconSettings size={26} stroke={2.2} />
        </BottomNavButton>
      </nav>
    </div>
  );
}

function BottomNavButton({
  active,
  label,
  children,
  onClick,
}: {
  active: boolean;
  label: string;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button className={active ? "active" : ""} type="button" onClick={onClick}>
      {children}
      <span>{label}</span>
    </button>
  );
}

function Leaderboard({ rows }: { rows: ReturnType<typeof calculateLeaderboard> }) {
  return (
    <div className="layout-grid">
      <section className="panel leaderboard-panel">
        <div className="section-title">
          <div className="title-group">
            <IconTrophy className="section-icon" size={22} stroke={2.2} />
            <h2>Tabelle</h2>
          </div>
          <span>{rows.length} Spieler</span>
        </div>
        <div className="leaderboard-head" aria-hidden="true">
          <span>Rang</span>
          <span>Spieler</span>
          <span>Gesamt</span>
          <span>
            ST1
            <small>(KT 1-3)</small>
          </span>
          <span>
            ST2
            <small>(KT 4-6)</small>
          </span>
          <span>
            ST3
            <small>(KT 7-10)</small>
          </span>
          <span />
        </div>
        <div className="leaderboard-list">
          {rows.map((row) => (
            <article className="leaderboard-row" key={row.id}>
              <div className="rank-badge">{row.rank}</div>
              <strong className="player-name">{row.name}</strong>
              <strong className="total-score">{row.total}</strong>
              {wmDays.map((day) => (
                <span className="day-score" key={day}>
                  {row.wmPoints[day]}
                </span>
              ))}
              <IconChevronRight className="row-chevron" size={22} stroke={2.3} />
            </article>
          ))}
        </div>
      </section>

      <aside className="panel mapping-panel">
        <div className="section-title">
          <div className="title-group">
            <IconCalendarWeek className="section-icon" size={22} stroke={2.2} />
            <h2>Spieltag-Zuordnung</h2>
          </div>
          <span>automatisch</span>
        </div>
        <div className="mapping-list">
          <MappingRow wmDay={1} kicktipp="1-3" />
          <MappingRow wmDay={2} kicktipp="4-6" />
          <MappingRow wmDay={3} kicktipp="7-10" />
        </div>
        <button className="archive-row" type="button">
          <IconArchive size={25} stroke={2.1} />
          <span>Archivierte Saisons</span>
          <IconChevronRight size={24} stroke={2.3} />
        </button>
      </aside>
    </div>
  );
}

function MappingRow({ wmDay, kicktipp }: { wmDay: number; kicktipp: string }) {
  return (
    <div className="mapping-row">
      <span className="mapping-number">{wmDay}</span>
      <div>
        <strong>WM Spieltag {wmDay}</strong>
        <span>Kicktipp {kicktipp}</span>
      </div>
      <span className="arrow-icon" aria-hidden="true">
        <IconChevronRight size={20} stroke={2.4} />
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
