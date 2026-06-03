import { WebSocket } from 'ws';

class RoomManager {
  private rooms = new Map<string, Set<WebSocket>>();
  private clientRooms = new Map<WebSocket, Set<string>>();

  join(key: string, ws: WebSocket) {
    if (!this.rooms.has(key)) this.rooms.set(key, new Set());
    this.rooms.get(key)!.add(ws);

    if (!this.clientRooms.has(ws)) this.clientRooms.set(ws, new Set());
    this.clientRooms.get(ws)!.add(key);
  }

  leaveAll(ws: WebSocket) {
    const keys = this.clientRooms.get(ws);
    if (keys) {
      keys.forEach((key) => this.rooms.get(key)?.delete(ws));
      this.clientRooms.delete(ws);
    }
  }

  broadcast(key: string, message: string, exclude?: WebSocket) {
    const clients = this.rooms.get(key);
    if (!clients) return;
    clients.forEach((client) => {
      if (client !== exclude && client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  }

  size(key: string) {
    return this.rooms.get(key)?.size ?? 0;
  }
}

export const rooms = new RoomManager();
