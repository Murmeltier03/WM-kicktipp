import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  IconCalendarWeek,
  IconInfoCircle,
  IconMenu2,
  IconSettings,
  IconTrophy,
  IconX,
} from "@tabler/icons-react";
import { kicktippGroups } from "./data/schedule";
import { clearStoredPassword, getStoredPassword, loadAdminState, loginAdmin, saveAdminState } from "./lib/adminApi";
import { CASH_PRIZES, KNOCKOUT_ROUNDS, POINT_ROUNDS, calculateLeaderboard, resizePlayers } from "./lib/points";
import { isSupabaseConfigured, loadPublicState } from "./lib/supabase";
import type { LeaderboardRow, Player, TournamentState } from "./types";

const wmDays = [1, 2, 3] as const;
const euroFormatter = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 2,
});

function formatEuro(value: number) {
  return euroFormatter.format(value);
}

function getScoreBreakdown(row: LeaderboardRow) {
  return [
    ...wmDays.map((day) => ({ label: `ST${day}`, value: row.wmPoints[day] })),
    ...KNOCKOUT_ROUNDS.map((round) => ({
      label: round.label,
      value: row.knockoutPoints[round.label],
    })),
  ];
}

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
          </div>
          <div className="status-strip" aria-label="Datenstatus">
            <span className={isSupabaseConfigured ? "status-dot live" : "status-dot demo"} />
            Stand: 11.06.2026
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
  const [isMappingOpen, setIsMappingOpen] = useState(false);

  return (
    <div className="layout-grid">
      <section className="panel leaderboard-panel">
        <div className="section-title">
          <div className="title-group">
            <IconTrophy className="section-icon" size={22} stroke={2.2} />
            <h2>Cash-out</h2>
          </div>
          <span>{rows.length} Spieler</span>
        </div>
        <div className="leaderboard-head" aria-hidden="true">
          <span>Rang</span>
          <span>Spieler</span>
          <span>Punkte</span>
          <span>Gewinn</span>
        </div>
        <div className="leaderboard-list">
          {rows.map((row) => (
            <article className="leaderboard-row" key={row.id}>
              <div className="rank-badge">{row.rank}</div>
              <span className="player-name">{row.name}</span>
              <strong className="points-score">{row.total}</strong>
              <strong className="cash-score">{formatEuro(row.cash.total)}</strong>
            </article>
          ))}
        </div>

        <div className="cash-prizes" aria-label="Cash-out System">
          <span>Spieltag 1 {formatEuro(CASH_PRIZES.matchdays[1])}</span>
          <span>Spieltag 2 {formatEuro(CASH_PRIZES.matchdays[2])}</span>
          <span>Spieltag 3 {formatEuro(CASH_PRIZES.matchdays[3])}</span>
          <span>Platz 1 {formatEuro(CASH_PRIZES.placements[1])}</span>
          <span>Platz 2 {formatEuro(CASH_PRIZES.placements[2])}</span>
          <span>Platz 3 {formatEuro(CASH_PRIZES.placements[3])}</span>
        </div>

        <div className="point-details">
          <div className="detail-title">
            <span>Punktdetails</span>
          </div>
          <div className="detail-list">
            {rows.map((row) => (
              <article className="detail-row" key={`${row.id}-details`}>
                <span className="detail-name">{row.name}</span>
                <div className="round-breakdown" aria-label={`Punktdetails von ${row.name}`}>
                  {getScoreBreakdown(row).map((score) => (
                    <span className="round-item" key={score.label}>
                      <em>{score.label}</em>
                      <strong>{score.value}</strong>
                    </span>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </div>

        <button className="explainer-button" type="button" onClick={() => setIsMappingOpen(true)}>
          <IconInfoCircle size={19} stroke={2.2} />
          <span>Wie funktioniert die Zuordnung?</span>
        </button>

        {isMappingOpen && createPortal(<MappingDialog onClose={() => setIsMappingOpen(false)} />, document.body)}
      </section>
    </div>
  );
}

function MappingDialog({ onClose }: { onClose: () => void }) {
  return (
    <div className="mapping-dialog-backdrop" role="presentation" onClick={onClose}>
      <section
        className="mapping-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="mapping-dialog-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="dialog-header">
          <div className="title-group">
            <IconCalendarWeek className="section-icon" size={22} stroke={2.2} />
            <h2 id="mapping-dialog-title">Zuordnung</h2>
          </div>
          <button className="dialog-close" type="button" aria-label="Hinweis schliessen" onClick={onClose}>
            <IconX size={20} stroke={2.4} />
          </button>
        </div>
        <p>
          Die Gruppenphase kommt aus Kicktipp in zehn Bloecken. Die App fasst sie automatisch zu den echten
          WM-Gruppenspieltagen zusammen.
        </p>
        <div className="mapping-list">
          <MappingRow label="1" title="WM Spieltag 1" detail="Kicktipp 1-3" />
          <MappingRow label="2" title="WM Spieltag 2" detail="Kicktipp 4-6" tone="red" />
          <MappingRow label="3" title="WM Spieltag 3" detail="Kicktipp 7-10" />
          <MappingRow label="KO" title="K.o.-Runden" detail="AF, VF, HF und Finale separat" tone="dark" />
        </div>
        <p className="dialog-note">Gesamt = ST1 + ST2 + ST3 + AF + VF + HF + F.</p>
      </section>
    </div>
  );
}

function MappingRow({
  label,
  title,
  detail,
  tone = "gold",
}: {
  label: string;
  title: string;
  detail: string;
  tone?: "gold" | "red" | "dark";
}) {
  return (
    <div className={`mapping-row ${tone}`}>
      <span className="mapping-number">{label}</span>
      <div>
        <strong>{title}</strong>
        <span>{detail}</span>
      </div>
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
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(Boolean(getStoredPassword()));
  const [draft, setDraft] = useState(publicState);
  const [message, setMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!getStoredPassword()) {
      setIsCheckingSession(false);
      return;
    }

    let isCancelled = false;
    loadAdminState()
      .then((adminState) => {
        if (isCancelled) return;
        setDraft(adminState);
        setIsLoggedIn(true);
      })
      .catch((error) => {
        if (isCancelled) return;
        clearStoredPassword();
        setPassword("");
        setIsLoggedIn(false);
        setMessage(error instanceof Error ? error.message : "Login fehlgeschlagen.");
      })
      .finally(() => {
        if (!isCancelled) setIsCheckingSession(false);
      });

    return () => {
      isCancelled = true;
    };
  }, []);

  async function handleLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsCheckingSession(false);
    setMessage("");
    try {
      await loginAdmin(password);
      const adminState = await loadAdminState();
      setDraft(adminState);
      setIsLoggedIn(true);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Login fehlgeschlagen.");
      clearStoredPassword();
      setPassword("");
      setIsLoggedIn(false);
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

  if (isCheckingSession) {
    return (
      <section className="panel admin-login">
        <div className="section-title">
          <h2>Admin-Login</h2>
          <span>Pruefe Sitzung</span>
        </div>
        <div className="notice">Admin-Daten werden geladen...</div>
      </section>
    );
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
              {POINT_ROUNDS.map((round) => (
                <th className="numeric" key={round.key}>
                  {round.label}
                </th>
              ))}
              <th className="numeric">Gesamt</th>
            </tr>
          </thead>
          <tbody>
            {draft.players.map((player) => {
              const total = POINT_ROUNDS.reduce((sum, round) => sum + Number(player.points[round.key] ?? 0), 0);
              return (
                <tr key={player.id}>
                  <td>
                    <input
                      value={player.name}
                      onChange={(event) => updatePlayer(player.id, (item) => ({ ...item, name: event.target.value }))}
                    />
                  </td>
                  {POINT_ROUNDS.map((round) => (
                    <td key={round.key}>
                      <input
                        className="point-input"
                        type="number"
                        min="0"
                        value={player.points[round.key] ?? 0}
                        onChange={(event) =>
                          updatePlayer(player.id, (item) => ({
                            ...item,
                            points: { ...item.points, [round.key]: Number(event.target.value) },
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
