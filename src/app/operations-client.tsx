'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

type Kind = 'team' | 'transport' | 'incidents' | 'reports';
type Row = Record<string, any>;

const reportsConfig: Config = {
  title: 'Reports & Export',
  table: '',
  intro: 'Export shared operational registers for review, backup and accountability.',
  fields: [],
  cols: [],
};

type FieldDef = [string, string, 'text' | 'select' | 'number' | 'date' | 'textarea', boolean, string[]?];

type Config = {
  title: string;
  table: string;
  intro: string;
  fields: FieldDef[];
  cols: [string, string][];
};

const nav = [
  ['/', 'Overview'],
  ['/daily', 'Daily checklist'],
  ['/funding', 'Funding & Sponsors'],
  ['/expenses', 'Expenses'],
  ['/tasks', 'Tasks & Meetings'],
  ['/team', 'Team & Volunteers'],
  ['/transport', 'Transport & Logistics'],
  ['/students', 'Student register'],
  ['/calls', 'Call tracker'],
  ['/stations', 'Polling Stations'],
  ['/incidents', 'Election-day issues'],
  ['/reports', 'Reports & Export'],
];

const configs: Record<string, Config> = {
  reports: reportsConfig,
  team: {
    title: 'Team & Volunteers',
    table: 'team_members',
    intro: 'Maintain team roles, station assignments and volunteer contact details.',
    fields: [
      ['full_name', 'Full name', 'text', true],
      ['role', 'Role', 'select', true, ['Campaign Manager', 'Finance Officer', 'Station Coordinator', 'Polling Agent', 'Volunteer', 'Administrator', 'Other']],
      ['team_area', 'Station / team', 'select', false, ['Central Team', 'FBMS', 'FAST A', 'FAST B', 'FOE', 'FBNE', 'FHAS']],
      ['contact', 'Contact (authorised)', 'text', false],
      ['status', 'Status', 'select', true, ['Active', 'Pending', 'Inactive']],
    ],
    cols: [
      ['full_name', 'Name'],
      ['role', 'Role'],
      ['team_area', 'Station / team'],
      ['contact', 'Contact'],
      ['status', 'Status'],
    ],
  },
  transport: {
    title: 'Transport & Logistics',
    table: 'transport_requests',
    intro: 'Track logistics requests, destinations, people, approvals and actual payments.',
    fields: [
      ['purpose', 'Purpose / request', 'text', true],
      ['requester', 'Requested by', 'text', false],
      ['destination', 'Destination', 'text', true],
      ['request_date', 'Date', 'date', false],
      ['people_count', 'Number of people', 'number', false],
      ['estimated_cost', 'Estimated cost (GH₵)', 'number', true],
      ['approved_cost', 'Approved cost (GH₵)', 'number', false],
      ['paid_cost', 'Amount paid (GH₵)', 'number', false],
      ['status', 'Status', 'select', true, ['Requested', 'Approved', 'Assigned', 'Completed', 'Declined']],
      ['notes', 'Notes / receipt reference', 'textarea', false],
    ],
    cols: [
      ['purpose', 'Purpose'],
      ['destination', 'Destination'],
      ['request_date', 'Date'],
      ['people_count', 'People'],
      ['estimated_cost', 'Estimated'],
      ['approved_cost', 'Approved'],
      ['paid_cost', 'Paid'],
      ['status', 'Status'],
    ],
  },
  incidents: {
    title: 'Election-Day Issues',
    table: 'incidents',
    intro: 'Record operational issues, assign an owner and track resolution.',
    fields: [
      ['title', 'Issue / incident', 'text', true],
      ['station', 'Polling station', 'select', true, ['FBMS', 'FAST A', 'FAST B', 'FOE', 'FBNE', 'FHAS', 'Campus-wide']],
      ['priority', 'Priority', 'select', true, ['Low', 'Normal', 'High', 'Urgent']],
      ['reported_by', 'Reported by', 'text', false],
      ['assigned_to', 'Assigned to', 'text', false],
      ['status', 'Status', 'select', true, ['Open', 'In progress', 'Resolved', 'Escalated']],
      ['details', 'Details / action notes', 'textarea', false],
    ],
    cols: [
      ['title', 'Issue'],
      ['station', 'Station'],
      ['priority', 'Priority'],
      ['assigned_to', 'Assigned to'],
      ['status', 'Status'],
    ],
  },
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="field">
      <label>{label}</label>
      {children}
    </div>
  );
}

export default function OperationsClient({ kind }: { kind: Kind }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [form, setForm] = useState<Row>({});
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<Row | null>(null);
  const db = createClient();

  const cfg = configs[kind] ?? reportsConfig;

  function buildBlankForm(): Row {
    const blank: Row = {};
    for (const [key, , type, , options] of cfg.fields) {
      if (type === 'select') {
        blank[key] = options?.[0] || '';
      } else {
        blank[key] = '';
      }
    }
    return blank;
  }

  function openNew() {
    setEditing(null);
    setForm(buildBlankForm());
  }

  function openEdit(row: Row) {
    setEditing(row);
    setForm({ ...row });
  }

  async function load() {
    if (kind === 'reports') return;
    const { data, error } = await db.from(cfg.table).select('*').order('created_at', { ascending: false });
    if (error) {
      setMsg(error.message);
      setRows([]);
      return;
    }
    setRows(data || []);
  }

  useEffect(() => {
    void load();
  }, [kind, db]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);

    const payload: Row = { ...form };
    if (kind === 'transport') {
      for (const key of ['people_count', 'estimated_cost', 'approved_cost', 'paid_cost']) {
        payload[key] = Number(payload[key] || 0);
      }
      payload.request_date = payload.request_date || null;
    }

    if (editing && editing.id) {
      const { error } = await db.from(cfg.table).update(payload).eq('id', editing.id);
      setMsg(error ? error.message : 'Record updated successfully.');
      if (!error) {
        setEditing(null);
        setForm(buildBlankForm());
        await load();
      }
      setBusy(false);
      return;
    }

    const { error } = await db.from(cfg.table).insert(payload);
    setMsg(error ? error.message : 'Record saved to the shared command centre.');
    if (!error) {
      setForm(buildBlankForm());
      await load();
    }
    setBusy(false);
  }

  async function updateRow(row: Row, patch: Row) {
    const { error } = await db.from(cfg.table).update(patch).eq('id', row.id);
    setMsg(error ? error.message : 'Record updated.');
    if (!error) await load();
  }

  function exportRows(key: string, records: Row[]) {
    if (!records.length) {
      setMsg('There are no records to export yet.');
      return;
    }
    const cols = [...new Set(records.flatMap((record) => Object.keys(record)))];
    const csv = [cols.join(','), ...records.map((record) => cols.map((column) => `"${String(record[column] ?? '').replace(/"/g, '""')}"`).join(',') )].join('\r\n');
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' }));
    link.download = `team-apk-${key}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  const filtered = rows.filter((record) => JSON.stringify(record).toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="mark">APK</div>
          <div><strong>TEAM APK</strong><small>ELECTION COMMAND CENTRE</small></div>
        </div>
        <nav>
          {nav.map(([url, label]) => (
            <Link key={url} className={`navlink ${url === `/${kind}` ? 'active' : ''}`} href={url}>{label}</Link>
          ))}
        </nav>
        <div className="sidebarfoot">APK FOR ALL<br />Unity · Service · Accountability</div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div>
            <div className="muted">TEAM APK / OPERATIONS</div>
            <h1>{cfg.title}</h1>
          </div>
          <form action="/auth/signout" method="post">
            <button className="btn">Sign out</button>
          </form>
        </header>

        <div className="content">
          <div className="welcome">
            <div>
              <h2>{cfg.title}</h2>
              <p className="muted">{cfg.intro}</p>
            </div>
          </div>

          {msg && <p className={msg.toLowerCase().includes('error') ? 'error' : 'success'}>{msg}</p>}

          {kind !== 'reports' && (
            <div className="card" style={{ marginBottom: 18 }}>
              <div className="toolbar" style={{ justifyContent: 'space-between' }}>
                <h3>{editing ? 'Edit saved record' : 'Add record'}</h3>
                {editing && <button type="button" className="btn" onClick={openNew}>New</button>}
              </div>

              <form onSubmit={save} style={{ marginTop: 14 }}>
                {cfg.fields.map(([field, label, type, required, options]) => {
                  const value = form[field] ?? '';

                  if (type === 'textarea') {
                    return (
                      <Field key={field} label={label}>
                        <textarea value={value} required={required} onChange={(e) => setForm({ ...form, [field]: e.target.value })} />
                      </Field>
                    );
                  }

                  if (type === 'select') {
                    return (
                      <Field key={field} label={label}>
                        <select value={value} required={required} onChange={(e) => setForm({ ...form, [field]: e.target.value })}>
                          {(options || []).map((option: string) => <option key={option}>{option}</option>)}
                        </select>
                      </Field>
                    );
                  }

                  if (type === 'number') {
                    return (
                      <Field key={field} label={label}>
                        <input min={0} step="0.01" type="number" value={value} required={required} onChange={(e) => setForm({ ...form, [field]: e.target.value })} />
                      </Field>
                    );
                  }

                  if (type === 'date') {
                    return (
                      <Field key={field} label={label}>
                        <input type="date" value={value} required={required} onChange={(e) => setForm({ ...form, [field]: e.target.value })} />
                      </Field>
                    );
                  }

                  return (
                    <Field key={field} label={label}>
                      <input value={value} required={required} onChange={(e) => setForm({ ...form, [field]: e.target.value })} />
                    </Field>
                  );
                })}

                <div className="toolbar" style={{ justifyContent: 'flex-end', marginTop: 10 }}>
                  <button className="btn" type="button" onClick={openNew}>Clear</button>
                  <button className="btn primary" type="submit" disabled={busy}>{busy ? 'Saving...' : editing ? 'Update record' : 'Save record'}</button>
                </div>
              </form>
            </div>
          )}

          {kind === 'reports' ? (
            <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(230px,1fr))' }}>
              {[
                ['sponsors', 'Funding & sponsors', 'Funding pledges and confirmed receipts'],
                ['expenses', 'Expenses', 'Estimated, approved and paid expenses'],
                ['tasks', 'Tasks & meetings', 'Assignments and completion status'],
                ['students', 'Student register', 'Authorised student outreach records'],
                ['call_logs', 'Call history', 'Call attempts and outcomes'],
                ['stations', 'Polling stations', 'Agent readiness and station checks'],
                ['team_members', 'Team & volunteers', 'Roles and station assignments'],
                ['transport_requests', 'Transport & logistics', 'Requests, approvals and payments'],
                ['incidents', 'Election-day issues', 'Operational incidents and resolution'],
              ].map(([tableName, title, desc]) => (
                <div className="card" key={tableName}>
                  <h3>{title}</h3>
                  <p style={{ margin: '8px 0 14px' }}>{desc}</p>
                  <button className="btn primary" onClick={async () => {
                    const { data, error } = await db.from(tableName).select('*');
                    if (error) {
                      setMsg(error.message);
                      return;
                    }
                    exportRows(tableName, data || []);
                  }}>Export CSV</button>
                </div>
              ))}
            </div>
          ) : (
            <div className="card">
              <div className="toolbar" style={{ justifyContent: 'space-between' }}>
                <h3>Saved rows</h3>
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search records" className="search" />
              </div>

              <table>
                <thead>
                  <tr>
                    {cfg.cols.map(([field, label]) => <th key={field}>{label}</th>)}
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length ? filtered.map((row) => (
                    <tr key={row.id}>
                      {cfg.cols.map(([field]) => <td key={`${row.id}-${field}`}>{row[field] ?? '—'}</td>)}
                      <td>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          <button className="btn" type="button" onClick={() => openEdit(row)}>Edit</button>
                          <button className="btn" type="button" onClick={() => updateRow(row, { status: row.status === 'Open' || row.status === 'Requested' ? 'Completed' : 'Open' })}>Toggle</button>
                        </div>
                      </td>
                    </tr>
                  )) : (
                    <tr><td className="empty" colSpan={cfg.cols.length + 1}>No records match your search.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          <div className="footer">TEAM APK · Shared operational records</div>
        </div>
      </main>
    </div>
  );
}
