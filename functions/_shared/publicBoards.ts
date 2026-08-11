type PublicBoardEnv = {
  DB: D1Database;
  APP_URL?: string;
};

export type PublicBoardSnapshot = {
  title: string;
  columns: unknown[];
  updatedAt: string;
};

const TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS public_boards (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    snapshot TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )
`;

export async function ensurePublicBoardsTable(db: D1Database) {
  await db.exec(TABLE_SQL);
}

export async function createPublicBoard(env: PublicBoardEnv, snapshot: PublicBoardSnapshot) {
  await ensurePublicBoardsTable(env.DB);
  const id = `board_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  await env.DB.prepare(
    `INSERT INTO public_boards (id, title, snapshot, created_at, updated_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`
  ).bind(id, snapshot.title, JSON.stringify(snapshot)).run();

  const baseUrl = (env.APP_URL || 'http://localhost:5173').replace(/\/$/, '');
  return {
    id,
    publicUrl: `${baseUrl}/desk?publicBoard=${encodeURIComponent(id)}`,
    snapshot,
  };
}

export async function getPublicBoard(env: PublicBoardEnv, id: string) {
  await ensurePublicBoardsTable(env.DB);
  const row = await env.DB.prepare(
    'SELECT id, title, snapshot, created_at, updated_at FROM public_boards WHERE id = ?'
  ).bind(id).first<{ id: string; title: string; snapshot: string; created_at: string; updated_at: string }>();

  if (!row) return null;

  return {
    id: row.id,
    title: row.title,
    snapshot: JSON.parse(row.snapshot) as PublicBoardSnapshot,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function updatePublicBoard(env: PublicBoardEnv, id: string, snapshot: PublicBoardSnapshot) {
  await ensurePublicBoardsTable(env.DB);
  const result = await env.DB.prepare(
    `UPDATE public_boards
     SET title = ?, snapshot = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`
  ).bind(snapshot.title, JSON.stringify(snapshot), id).run();

  if (!result.success || result.meta.changes === 0) {
    return null;
  }

  const baseUrl = (env.APP_URL || 'http://localhost:5173').replace(/\/$/, '');
  return {
    id,
    publicUrl: `${baseUrl}/desk?publicBoard=${encodeURIComponent(id)}`,
    snapshot,
  };
}
