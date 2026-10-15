'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

const stationNames = ['FBMS','FAST A','FAST B','FOE','FBNE','FHAS'];
const defaultTargets: Record<string, number> = { FBMS: 1000, 'FAST A': 1500, 'FAST B': 1000, FOE: 1000, FBNE: 1000, FHAS: 1000 };

type StationRow = {
  id?: string;
  name: string;
  target_votes: number;
  actual_votes: number;
  result_status: string;
  notes?: string | null;
  agent_name?: string | null;
};

export default function FinalResultsClient() {
  const [rows, setRows] = useState<StationRow[]>([]);
  const [msg, setMsg] = useState('');
  const db = createClient();

  async function load() {
    const { data, error } = await db.from('stations').select('*').order('name');
    if (error) {
      setMsg('Final results could not load from Supabase. Using default targets while the live station data is synced.');
      setRows(stationNames.map((name) => ({ name, target_votes: defaultTargets[name], actual_votes: 0, result_status: 'Pending' })));
      return;
    }

    const normalized = (data && data.length ? data : stationNames.map((name) => ({ name, target_votes: defaultTargets[name], actual_votes: 0, result_status: 'Pending' })))
      .map((row: any) => ({
        id: row.id,
        name: row.name,
        target_votes: Number(row.target_votes ?? defaultTargets[row.name] ?? 0),
        actual_votes: Number(row.actual_votes ?? 0),
        result_status: row.result_status ?? (Number(row.actual_votes ?? 0) >= Number(row.target_votes ?? defaultTargets[row.name] ?? 0) ? 'Won' : 'Lost'),
        notes: row.notes ?? null,
        agent_name: row.agent_name ?? null,
      } as StationRow));

    const seen = new Set<string>();
    const filled: StationRow[] = [];
    for (const name of stationNames) {
      const existing = normalized.find((row: StationRow) => row.name === name);
      if (existing) {
        seen.add(name);
        filled.push(existing);
      } else {
        filled.push({ name, target_votes: defaultTargets[name], actual_votes: 0, result_status: 'Pending' });
      }
    }

    setRows(filled);
  }

  async function updateStation(row: StationRow, actualVotes: number) {
    const targetVotes = Number(row.target_votes || defaultTargets[row.name] || 0);
    const cleanActual = Number(actualVotes || 0);
    const status = cleanActual >= targetVotes ? 'Won' : 'Lost';
    const { error } = await db.from('stations').upsert({
      id: row.id,
      name: row.name,
      target_votes: targetVotes,
      actual_votes: cleanActual,
      result_status: status,
    }, { onConflict: 'name' });

    if (error) {
      setMsg(error.message);
      return;
    }

    setMsg('Final station result saved.');
    await load();
  }

  useEffect(() => {
    void load();
  }, []);

  const totalTarget = rows.reduce((sum, row) => sum + Number(row.target_votes || 0), 0);
  const totalActual = rows.reduce((sum, row) => sum + Number(row.actual_votes || 0), 0);
  const totalWon = rows.filter((row) => row.result_status === 'Won').length;
  const totalLost = rows.filter((row) => row.result_status === 'Lost').length;

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="mark">APK</div>
          <div><strong>TEAM APK</strong><small>ELECTION COMMAND CENTRE</small></div>
        </div>
        <nav>
          <Link className="navlink" href="/">Overview</Link>
          <Link className="navlink" href="/students">Student register</Link>
          <Link className="navlink" href="/stations">Polling Stations</Link>
          <Link className="navlink active" href="/final-results">Final results</Link>
        </nav>
        <div className="sidebarfoot">APK FOR ALL<br/>Unity · Service · Accountability</div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div>
            <div className="muted">TEAM APK / FINAL DAY</div>
            <h1>Final results & vote tally</h1>
          </div>
          <form action="/auth/signout" method="post"><button className="btn">Sign out</button></form>
        </header>

        <div className="content">
          <div className="welcome">
            <div>
              <h2>Live final results tracker</h2>
              <p className="muted">Update the actual vote count per polling station and compare it with the target set before polling day.</p>
            </div>
            <Link className="btn primary" href="/stations">Edit station targets</Link>
          </div>

          {msg && <div className="notice"><strong>Update:</strong> {msg}</div>}

          <div className="grid stats">
            <div className="card">
              <div className="label">Total target votes</div>
              <div className="metric">{totalTarget.toLocaleString()}</div>
            </div>
            <div className="card">
              <div className="label">Actual votes</div>
              <div className="metric">{totalActual.toLocaleString()}</div>
            </div>
            <div className="card">
              <div className="label">Stations won</div>
              <div className="metric">{totalWon}</div>
            </div>
            <div className="card">
              <div className="label">Stations lost</div>
              <div className="metric">{totalLost}</div>
            </div>
          </div>

          <div className="grid two" style={{ marginTop: 18 }}>
            {rows.map((row) => {
              const delta = Number(row.actual_votes || 0) - Number(row.target_votes || 0);
              const status = row.result_status || (delta >= 0 ? 'Won' : 'Lost');

              return (
                <div className="card" key={row.name}>
                  <div className="toolbar" style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <div>
                      <div className="label">Polling station</div>
                      <h3 style={{ marginTop: 6 }}>{row.name}</h3>
                    </div>
                    <span className={`badge ${status === 'Won' ? 'green' : ''}`}>{status}</span>
                  </div>

                  <div className="field">
                    <label>Target votes</label>
                    <input type="number" value={row.target_votes} onChange={(e) => setRows((current) => current.map((station) => station.name === row.name ? { ...station, target_votes: Number(e.target.value || 0) } : station))} onBlur={() => updateStation(rows.find((station) => station.name === row.name) || row, Number(rows.find((station) => station.name === row.name)?.actual_votes ?? 0))} />
                  </div>

                  <div className="field">
                    <label>Actual votes</label>
                    <input type="number" value={row.actual_votes} onChange={(e) => setRows((current) => current.map((station) => station.name === row.name ? { ...station, actual_votes: Number(e.target.value || 0) } : station))} onBlur={() => updateStation(rows.find((station) => station.name === row.name) || row, Number(rows.find((station) => station.name === row.name)?.actual_votes ?? 0))} />
                  </div>

                  <div className="notice" style={{ marginBottom: 0 }}>
                    <strong>{delta >= 0 ? 'Ahead' : 'Behind'}</strong> by {Math.abs(delta).toLocaleString()} votes vs target.
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
}
