import { createPublicBoard } from '../../_shared/publicBoards';

type Env = {
  DB: D1Database;
  APP_URL?: string;
};

export async function onRequestPost(context: { request: Request; env: Env }) {
  const { request, env } = context;
  const body = await request.json().catch(() => ({}));
  const title = String(body?.title || 'BolekDash').trim();
  const columns = Array.isArray(body?.columns) ? body.columns : [];

  if (!columns.length) {
    return Response.json({ error: 'columns are required.' }, { status: 400 });
  }

  const result = await createPublicBoard(env, {
    title: title || 'BolekDash',
    columns,
    updatedAt: new Date().toISOString(),
  });

  return Response.json({ success: true, ...result });
}
