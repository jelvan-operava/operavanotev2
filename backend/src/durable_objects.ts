export class DocumentCollaboration {
  state: DurableObjectState;

  constructor(state: DurableObjectState, env: any) {
    this.state = state;
  }

  async fetch(request: Request) {
    // Upgrade request to WebSocket
    if (request.headers.get("Upgrade") === "websocket") {
      const pair = new WebSocketPair();
      const [client, server] = Object.values(pair);
      
      this.state.acceptWebSocket(server);
      
      return new Response(null, { status: 101, webSocket: client });
    }

    return new Response("Expected Upgrade: websocket", { status: 426 });
  }

  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer) {
    // Handle CRDT updates (like Yjs) or OT messages
    // Broadcast to all connected clients
    const clients = this.state.getWebSockets();
    for (const client of clients) {
      if (client !== ws) {
        client.send(message);
      }
    }
  }

  async webSocketClose(ws: WebSocket, code: number, reason: string, wasClean: boolean) {
    ws.close(code, "Connection closed");
  }
}
