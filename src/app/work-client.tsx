'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

type Kind = 'funding' | 'expenses' | 'tasks' | 'stations';
type Row = Record<string, any>;

const cash = (n: number) => `GH₵${Number(n || 0).toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const stationNames = ['FBMS', 'FAST A', 'FAST B', 'FOE', 'FBNE', 'FHAS'];
const expenseCategories = ['Feeding', 'Money given out', 'Water', 'Food', 'Printing', 'Busing', 'Transport', 'Calls & SMS', 'Polling-agent feeding', 'Campaign materials', 'Volunteer logistics', 'Emergency', 'Other'];

const defaultStationRows = stationNames.map((name) => ({
  id: `default-${name}`,
  name,
  target_votes: name === 'FAST A' ? 1500 : 1000,
  agent_name: null,
  agent_briefed: false,
  supplies_checked: false,
  transport_arranged: false,
}));

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="field">
      <label>{label}</label>
      {children}
    </div>
  );
}

export default function Work({ kind }: { kind: Kind }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [msg, setMsg] = useState('');
  const [f, setF] = useState<Row>({});
  const [editing, setEditing] = useState<Row | null>(null);

  const titles = {
    funding: 'Funding & Sponsors',
    expenses: 'Expenses & Budget',
    tasks: 'Tasks & Meetings',
    stations: 'Polling Stations',
  };

  const table = { funding: 'sponsors', expenses: 'expenses', tasks: 'tasks', stations: 'stations' }[kind];

  function getBlankRecord() {
    if (kind === 'funding') {
      return {
        name: '',
        source: 'Business sponsorship',
        requested_amount: '',
        pledged_amount: '',
        received_amount: '',
        status: 'Prospect',
        notes: '',
      };
    }

    if (kind === 'expenses') {
      return {
        title: '',
        category: 'Feeding',
        estimated_amount: '',
        approved_amount: '',
        paid_amount: '',
        status: 'Planned',
        date: '',
        notes: '',
      };
    }

    if (kind === 'tasks') {
      return {
        title: '',
        category: 'Campaign operations',
        owner_name: '',
        due_date: '',
        status: 'Open',
        notes: '',
      };
    }

    return {};
  }

  function openNew() {
    setEditing(null);
    setF(getBlankRecord());
  }

  function openEdit(row: Row) {
    setEditing(row);
    setF({
      ...row,
      requested_amount: row.requested_amount ?? '',
      pledged_amount: row.pledged_amount ?? '',
      received_amount: row.received_amount ?? '',
      estimated_amount: row.estimated_amount ?? '',
      approved_amount: row.approved_amount ?? '',
      paid_amount: row.paid_amount ?? '',
      due_date: row.due_date ?? '',
      date: row.date ?? '',
      notes: row.notes ?? '',
    });
  }

  async function load() {
    const s = createClient();

    if (kind === 'stations') {
      const { data, error } = await s.from(table).select('*').order('name');

      if (error) {
        setMsg('Station targets could not load from Supabase, so the default targets are being shown.');
        setRows(defaultStationRows);
        return;
      }

      const rowsFromDb = (data && data.length ? data : defaultStationRows).map((row: any) => ({
        ...row,
        target_votes: row.target_votes ?? (row.name === 'FAST A' ? 1500 : 1000),
      }));

      const seen = new Set(rowsFromDb.map((x: any) => x.name));
      for (const name of stationNames) {
        if (!seen.has(name)) {
          rowsFromDb.push({
            id: `default-${name}`,
            name,
            target_votes: name === 'FAST A' ? 1500 : 1000,
            agent_name: null,
            agent_briefed: false,
            supplies_checked: false,
            transport_arranged: false,
          });
        }
      }

      const sorted = rowsFromDb.sort((a: any, b: any) => stationNames.indexOf(a.name) - stationNames.indexOf(b.name));
      setRows(sorted);

      if (!data || data.length === 0) {
        await s.from(table).upsert(
          sorted.filter((r: any) => r.name).map((r: any) => ({
            name: r.name,
            target_votes: Number(r.target_votes || 0),
          })),
          { onConflict: 'name' }
        );
      }

      return;
    }

    const { data, error } = await s.from(table).select('*').order('created_at', { ascending: false });
    if (error) {
      setMsg(error.message);
      setRows([]);
      return;
    }

    setRows(data || []);
  }

  useEffect(() => {
    void load();
  }, [kind]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const s = createClient();
    const payload: Row = { ...f };

    if (kind === 'funding') {
      for (const key of ['requested_amount', 'pledged_amount', 'received_amount']) {
        payload[key] = Number(payload[key] || 0);
      }
      payload.notes = payload.notes || null;
    }

    if (kind === 'expenses') {
      for (const key of ['estimated_amount', 'approved_amount', 'paid_amount']) {
        payload[key] = Number(payload[key] || 0);
      }
      payload.date = payload.date || null;
      payload.notes = payload.notes || null;
    }

    if (kind === 'tasks') {
      payload.due_date = payload.due_date || null;
      payload.owner_name = payload.owner_name || null;
      payload.notes = payload.notes || null;
    }

    if (editing && editing.id) {
      const { error } = await s.from(table).update(payload).eq('id', editing.id);
      setMsg(error ? error.message : 'Saved changes updated successfully.');
      if (!error) {
        setEditing(null);
        setF(getBlankRecord());
        await load();
      }
      return;
    }

    const { error } = await s.from(table).insert(payload);
    setMsg(error ? error.message : 'Record saved.');
    if (!error) {
      setF(getBlankRecord());
      await load();
    }
  }

  async function updateRecord(row: Row, patch: Row) {
    if (kind === 'stations') {
      const payload = { name: row.name, ...patch };
      const { error } = await createClient().from(table).upsert(payload, { onConflict: 'name' });
      setMsg(error ? error.message : 'Updated.');
      if (!error) {
        setRows((current) => current.map((entry) => entry.name === row.name ? { ...entry, ...payload } : entry));
        await load();
      }
      return;
    }

    const { error } = await createClient().from(table).update(patch).eq('id', row.id);
    setMsg(error ? error.message : 'Updated.');
    if (!error) await load();
  }

  const totals = (key: string) => rows.reduce((sum, row) => sum + Number(row[key] || 0), 0);

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="mark">APK</div>
          <div>
            <strong>TEAM APK</strong>
            <small>ELECTION COMMAND CENTRE</small>
          </div>
        </div>
        <nav>
          {[
            ['/', 'Overview'],
            ['/daily', 'Daily checklist'],
            ['/funding', 'Funding & Sponsors'],
            ['/expenses', 'Expenses'],
            ['/tasks', 'Tasks & Meetings'],
            ['/students', 'Student register'],
            ['/calls', 'Call tracker'],
            ['/stations', 'Polling Stations'],
            ['/team', 'Team & Volunteers'],
            ['/transport', 'Transport & Logistics'],
            ['/incidents', 'Election-day issues'],
            ['/reports', 'Reports & Export'],
          ].map(([url, label]) => (
            <Link key={url} className={`navlink ${url === `/${kind}` ? 'active' : ''}`} href={url}>{label}</Link>
          ))}
        </nav>
        <div className="sidebarfoot">APK FOR ALL<br />Unity · Service · Accountability</div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div>
            <div className="muted">TEAM APK / WORKSPACE</div>
            <h1>{titles[kind]}</h1>
          </div>
          <form action="/auth/signout" method="post">
            <button className="btn">Sign out</button>
          </form>
        </header>

        <div className="content">
          <div className="welcome">
            <div>
              <h2>{titles[kind]}</h2>
              <p className="muted">
                {kind === 'funding' && 'Track pledges separately from money received.'}
                {kind === 'expenses' && 'Track estimated, approved, and paid amounts, including feeding, water, food, printing and transport costs.'}
                {kind === 'tasks' && 'Assign owners, deadlines, and next actions.'}
                {kind === 'stations' && 'Track six polling-station readiness checklists.'}
              </p>
            </div>
            <Link className="btn" href="/">Overview</Link>
          </div>

          {kind !== 'stations' && (
            <div className="card" style={{ marginBottom: 18 }}>
              <div className="toolbar" style={{ justifyContent: 'space-between' }}>
                <h3>{editing ? 'Edit saved record' : 'Add record'}</h3>
                {editing && <button type="button" className="btn" onClick={openNew}>New</button>}
              </div>

              <form onSubmit={save} style={{ marginTop: 14 }}>
                {kind === 'funding' && (
                  <>
                    <Field label="Sponsor / organization"><input required value={f.name || ''} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
                    <Field label="Amount requested (GH₵)"><input type="number" min="0" step="0.01" value={f.requested_amount ?? ''} onChange={(e) => setF({ ...f, requested_amount: e.target.value })} /></Field>
                    <Field label="Amount pledged (GH₵)"><input type="number" min="0" step="0.01" value={f.pledged_amount ?? ''} onChange={(e) => setF({ ...f, pledged_amount: e.target.value })} /></Field>
                    <Field label="Amount received (GH₵)"><input type="number" min="0" step="0.01" value={f.received_amount ?? ''} onChange={(e) => setF({ ...f, received_amount: e.target.value })} /></Field>
                    <Field label="Source"><select value={f.source || 'Business sponsorship'} onChange={(e) => setF({ ...f, source: e.target.value })}>{['Business sponsorship', 'Individual donation', 'Supporter contribution', 'Team contribution', 'Other'].map((option) => <option key={option}>{option}</option>)}</select></Field>
                    <Field label="Status"><select value={f.status || 'Prospect'} onChange={(e) => setF({ ...f, status: e.target.value })}>{['Prospect', 'Contacted', 'Requested', 'Pledged', 'Partially received', 'Received', 'Declined'].map((option) => <option key={option}>{option}</option>)}</select></Field>
                    <Field label="Notes"><textarea value={f.notes || ''} onChange={(e) => setF({ ...f, notes: e.target.value })} /></Field>
                  </>
                )}

                {kind === 'expenses' && (
                  <>
                    <Field label="Expense description"><input required value={f.title || ''} onChange={(e) => setF({ ...f, title: e.target.value })} /></Field>
                    <Field label="Category"><select value={f.category || 'Feeding'} onChange={(e) => setF({ ...f, category: e.target.value })}>{expenseCategories.map((option) => <option key={option}>{option}</option>)}</select></Field>
                    <Field label="Estimated amount (GH₵)"><input type="number" min="0" step="0.01" value={f.estimated_amount ?? ''} onChange={(e) => setF({ ...f, estimated_amount: e.target.value })} /></Field>
                    <Field label="Approved amount (GH₵)"><input type="number" min="0" step="0.01" value={f.approved_amount ?? ''} onChange={(e) => setF({ ...f, approved_amount: e.target.value })} /></Field>
                    <Field label="Amount paid (GH₵)"><input type="number" min="0" step="0.01" value={f.paid_amount ?? ''} onChange={(e) => setF({ ...f, paid_amount: e.target.value })} /></Field>
                    <Field label="Status"><select value={f.status || 'Planned'} onChange={(e) => setF({ ...f, status: e.target.value })}>{['Planned', 'Requested', 'Approved', 'Partially paid', 'Paid', 'Declined'].map((option) => <option key={option}>{option}</option>)}</select></Field>
                    <Field label="Date"><input type="date" value={f.date || ''} onChange={(e) => setF({ ...f, date: e.target.value })} /></Field>
                    <Field label="Notes"><textarea value={f.notes || ''} onChange={(e) => setF({ ...f, notes: e.target.value })} /></Field>
                  </>
                )}

                {kind === 'tasks' && (
                  <>
                    <Field label="Task / meeting title"><input required value={f.title || ''} onChange={(e) => setF({ ...f, title: e.target.value })} /></Field>
                    <Field label="Category"><select value={f.category || 'Campaign operations'} onChange={(e) => setF({ ...f, category: e.target.value })}>{['Campaign operations', 'Team meeting', 'Volunteer outreach', 'Logistics', 'Training', 'Finance', 'Other'].map((option) => <option key={option}>{option}</option>)}</select></Field>
                    <Field label="Owner / team member"><input value={f.owner_name || ''} onChange={(e) => setF({ ...f, owner_name: e.target.value })} /></Field>
                    <Field label="Due date"><input type="date" value={f.due_date || ''} onChange={(e) => setF({ ...f, due_date: e.target.value })} /></Field>
                    <Field label="Status"><select value={f.status || 'Open'} onChange={(e) => setF({ ...f, status: e.target.value })}>{['Open', 'In progress', 'Completed', 'Blocked'].map((option) => <option key={option}>{option}</option>)}</select></Field>
                    <Field label="Notes"><textarea value={f.notes || ''} onChange={(e) => setF({ ...f, notes: e.target.value })} /></Field>
                  </>
                )}

                <div className="toolbar" style={{ justifyContent: 'flex-end', marginTop: 10 }}>
                  <button className="btn" type="button" onClick={openNew}>Clear</button>
                  <button className="btn primary" type="submit">{editing ? 'Update record' : 'Save record'}</button>
                </div>
              </form>
            </div>
          )}

          {msg && <p className={msg.toLowerCase().includes('error') ? 'error' : 'success'}>{msg}</p>}

          {kind === 'stations' ? (
            <div className="notice"><strong>Operational checklist only</strong> Use verified information and avoid sensitive student details.</div>
          ) : (
            <div className="card">
              <div className="toolbar" style={{ justifyContent: 'space-between' }}>
                <h3>Saved records</h3>
                <span className="muted">{rows.length} total</span>
              </div>

              <table>
                <thead>
                  <tr>
                    {kind === 'funding' ? ['Sponsor', 'Pledged', 'Received', 'Status'].map((label) => <th key={label}>{label}</th>) : null}
                    {kind === 'expenses' ? ['Expense', 'Estimated', 'Approved', 'Paid', 'Status'].map((label) => <th key={label}>{label}</th>) : null}
                    {kind === 'tasks' ? ['Task', 'Owner', 'Due', 'Status'].map((label) => <th key={label}>{label}</th>) : null}
                  </tr>
                </thead>
                <tbody>
                  {rows.length ? rows.map((row) => (
                    <tr key={row.id ?? `${row.name ?? row.title ?? 'row'}-${Math.random()}`}>
                      {kind === 'funding' && (
                        <>
                          <td>{row.name}<div className="muted">{row.source}</div></td>
                          <td>{cash(Number(row.pledged_amount || 0))}</td>
                          <td>{cash(Number(row.received_amount || 0))}</td>
                          <td>
                            <span className="badge">{row.status}</span>
                            <div style={{ marginTop: 8 }}>
                              <button className="btn" type="button" onClick={() => openEdit(row)}>Edit</button>
                            </div>
                          </td>
                        </>
                      )}

                      {kind === 'expenses' && (
                        <>
                          <td>{row.title}<div className="muted">{row.category}</div></td>
                          <td>{cash(Number(row.estimated_amount || 0))}</td>
                          <td>{cash(Number(row.approved_amount || 0))}</td>
                          <td>{cash(Number(row.paid_amount || 0))}</td>
                          <td>
                            <span className="badge">{row.status}</span>
                            <div style={{ marginTop: 8 }}>
                              <button className="btn" type="button" onClick={() => openEdit(row)}>Edit</button>
                            </div>
                          </td>
                        </>
                      )}

                      {kind === 'tasks' && (
                        <>
                          <td>{row.title}<div className="muted">{row.notes || row.category}</div></td>
                          <td>{row.owner_name || 'Unassigned'}</td>
                          <td>{row.due_date || '—'}</td>
                          <td>
                            <span className={`badge ${row.status === 'Completed' ? 'green' : ''}`}>{row.status}</span>
                            <div style={{ marginTop: 8, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                              <button className="btn" type="button" onClick={() => updateRecord(row, { status: row.status === 'Completed' ? 'Open' : 'Completed' })}>{row.status === 'Completed' ? 'Reopen' : 'Complete'}</button>
                              <button className="btn" type="button" onClick={() => openEdit(row)}>Edit</button>
                            </div>
                          </td>
                        </>
                      )}
                    </tr>
                  )) : (
                    <tr><td colSpan={kind === 'funding' ? 4 : kind === 'expenses' ? 5 : 4} className="empty">No records yet.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {kind === 'stations' && (
            <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(270px,1fr))' }}>
              {stationNames.map((name) => {
                const row = rows.find((x) => x.name === name);
                const ready = !!row?.agent_name && !!row?.agent_briefed && !!row?.supplies_checked && !!row?.transport_arranged;

                return (
                  <div className="card" key={name}>
                    <div className="welcome">
                      <h3>{name}</h3>
                      <span className={`badge ${ready ? 'green' : ''}`}>{ready ? 'Ready' : 'In progress'}</span>
                    </div>

                    <Field label="Polling agent"><input defaultValue={row?.agent_name || ''} onBlur={(e) => row && updateRecord(row, { agent_name: e.target.value || null })} placeholder="Agent name" /></Field>
                    <Field label="Coordinator"><input defaultValue={row?.coordinator_name || ''} onBlur={(e) => row && updateRecord(row, { coordinator_name: e.target.value || null })} placeholder="Coordinator name" /></Field>
                    <Field label="Target votes"><input type="number" min="0" step="1" defaultValue={Number(row?.target_votes || 0)} onBlur={(e) => row && updateRecord(row, { target_votes: Number(e.target.value || 0) })} placeholder="Target votes" /></Field>

                    {([
                      ['agent_briefed', 'Agent briefed'],
                      ['supplies_checked', 'Supplies checked'],
                      ['transport_arranged', 'Transport arranged'],
                    ] as const).map(([key, label]) => (
                      <label key={key} style={{ display: 'flex', gap: 8, alignItems: 'center', margin: '12px 0' }}>
                        <input type="checkbox" checked={!!row?.[key]} onChange={(e) => row && updateRecord(row, { [key]: e.target.checked })} />
                        {label}
                      </label>
                    ))}

                    <Field label="Notes"><textarea defaultValue={row?.notes || ''} onBlur={(e) => row && updateRecord(row, { notes: e.target.value || null })} /></Field>
                  </div>
                );
              })}
            </div>
          )}

          {kind !== 'stations' && (
            <div className="card" style={{ marginTop: 18 }}>
              <h3>Summary</h3>
              <div className="grid stats">
                <div className="card">
                  <div className="label">Records</div>
                  <div className="metric">{rows.length}</div>
                </div>
                <div className="card">
                  <div className="label">Total value</div>
                  <div className="metric">{kind === 'funding' ? cash(totals('received_amount')) : kind === 'expenses' ? cash(totals('paid_amount')) : cash(rows.reduce((sum, row) => sum + Number(row.estimated_amount || 0), 0))}</div>
                </div>
              </div>
            </div>
          )}

          <div className="footer">TEAM APK · Internal operations tool</div>
        </div>
      </main>
    </div>
  );
}
