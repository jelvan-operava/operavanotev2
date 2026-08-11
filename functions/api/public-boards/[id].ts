import { getPublicBoard, updatePublicBoard } from '../../_shared/publicBoards';

type Env = {
  DB: D1Database;
  APP_URL?: string;
};

export async function onRequestGet(context: { params: Record<string, string>; env: Env }) {
  const id = context.params.id;
  const board = await getPublicBoard(context.env, id);

  if (!board) {
    return Response.json({ error: 'Public board not found.' }, { status: 404 });
  }

  return Response.json({ success: true, ...board });
}

export async function onRequestPut(context: { request: Request; params: Record<string, string>; env: Env }) {
  const id = context.params.id;
  const body = await context.request.json().catch(() => ({}));
  const title = String(body?.title || 'BolekDash').trim();
  const columns = Array.isArray(body?.columns) ? body.columns : [];

  if (!columns.length) {
    return Response.json({ error: 'columns are required.' }, { status: 400 });
  }

  const result = await updatePublicBoard(context.env, id, {
    title: title || 'BolekDash',
    columns,
    updatedAt: new Date().toISOString(),
  });

  if (!result) {
    return Response.json({ error: 'Public board not found.' }, { status: 404 });
  }

  return Response.json({ success: true, ...result });
}
