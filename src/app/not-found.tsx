import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="auth">
      <div className="card">
        <div className="brand">
          <div className="mark">APK</div>
          <div>
            <strong>TEAM APK</strong>
            <small className="muted">ELECTION COMMAND CENTRE</small>
          </div>
        </div>
        <h1>Page not found</h1>
        <p className="muted">The page you requested is not available in this command centre.</p>
        <Link className="btn primary" href="/" style={{ display: 'inline-block', width: '100%', textAlign: 'center' }}>
          Back to overview
        </Link>
      </div>
    </main>
  );
}
