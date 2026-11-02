import Link from "next/link";

export default function NotFound() {
  return (
    <main className="shell">
      <div className="state" style={{ marginTop: 64 }}>
        <h2>Page not found</h2>
        <p>That page doesn’t exist.</p>
        <Link className="btn btn-primary" href="/">Back to search</Link>
      </div>
    </main>
  );
}
