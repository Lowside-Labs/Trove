import { useEffect, useState } from "react";
import type { WorkspaceSnapshot } from "trove-contracts";

export function App() {
  const [snapshot, setSnapshot] = useState<WorkspaceSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    void window.troveDesktop.workspace
      .getSnapshot()
      .then((nextSnapshot) => {
        if (!cancelled) {
          setSnapshot(nextSnapshot);
        }
      })
      .catch((nextError: unknown) => {
        if (!cancelled) {
          setError(nextError instanceof Error ? nextError.message : String(nextError));
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return (
      <main className="shell">
        <section className="panel hero">
          <p className="eyebrow">Desktop foundation</p>
          <h1>Trove could not load the workspace snapshot.</h1>
          <p className="lede">{error}</p>
        </section>
      </main>
    );
  }

  if (!snapshot) {
    return (
      <main className="shell">
        <section className="panel hero">
          <p className="eyebrow">Desktop foundation</p>
          <h1>Loading the Trove workspace…</h1>
          <p className="lede">The desktop shell is asking `trove-core` for a validated snapshot.</p>
        </section>
      </main>
    );
  }

  if (snapshot.status === "missing") {
    return (
      <main className="shell">
        <section className="panel hero">
          <p className="eyebrow">Workspace required</p>
          <h1>No Trove workspace is configured yet.</h1>
          <p className="lede">{snapshot.message}</p>
          <p className="hint">
            Run <code>trove init --path ~/Trove</code> or launch the app with{" "}
            <code>TROVE_HOME</code> set to an existing workspace.
          </p>
        </section>
      </main>
    );
  }

  return (
    <main className="shell">
      <section className="panel hero">
        <p className="eyebrow">Desktop foundation</p>
        <h1>Trove can load the shared workspace through a typed Electron bridge.</h1>
        <p className="lede">
          This first slice proves the boundary: renderer to preload to main to `trove-core`, with
          validated contracts on both sides of IPC.
        </p>
        <dl className="metrics">
          <div>
            <dt>Workspace</dt>
            <dd>{snapshot.overview.root}</dd>
          </div>
          <div>
            <dt>Items</dt>
            <dd>{snapshot.overview.totalItems}</dd>
          </div>
          <div>
            <dt>Sources</dt>
            <dd>{snapshot.overview.totalSources}</dd>
          </div>
          <div>
            <dt>Last sync</dt>
            <dd>{snapshot.overview.lastSyncedAt ?? "Not synced yet"}</dd>
          </div>
        </dl>
      </section>

      <section className="panel">
        <div className="section-header">
          <div>
            <p className="eyebrow">Source status</p>
            <h2>Known sources in the archive engine</h2>
          </div>
          <p className="hint">
            Every card comes from `trove-core`, not from renderer-side data access.
          </p>
        </div>
        <div className="source-grid">
          {snapshot.sources.map((source) => (
            <article key={source.id} className="source-card">
              <header>
                <p className="source-name">{source.displayName}</p>
                <p className="source-auth">{source.authMode}</p>
              </header>
              <dl>
                <div>
                  <dt>Items</dt>
                  <dd>{source.itemCount}</dd>
                </div>
                <div>
                  <dt>Last sync</dt>
                  <dd>{source.lastSyncedAt ?? "Never"}</dd>
                </div>
                <div>
                  <dt>Kinds</dt>
                  <dd>
                    {source.kinds.length > 0
                      ? source.kinds.map((kind) => kind.id).join(", ")
                      : "Default"}
                  </dd>
                </div>
              </dl>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
