import { Server } from "socket.io";
import { Server as Engine } from "@socket.io/bun-engine";
import { Hono } from "hono";
import { WS_HOST, WS_PORT, WS_URL } from "./src/env";
import type { Message } from "../client/src/types";

console.log('Server will bind WS on', WS_HOST, WS_PORT, 'ws-url', WS_URL);

const io = new Server();
const engine = new Engine();

io.bind(engine);

io.on("connection", (socket) => {
  console.log('socket connected', socket.id);
  // Example: use client Message type (type-only import erased at runtime)
  socket.on('message', (m: Message) => {
    console.log('received message', m);
  });
});

const app = new Hono();

const { websocket } = engine.handler();

export default {
  port: WS_PORT,
  idleTimeout: 30,

  fetch(req:Request, server:Bun.Server<any>) {
    const url = new URL(req.url);

    if (url.pathname === "/socket.io/") {
      return engine.handleRequest(req, server);
    } else {
      return app.fetch(req, server);
    }
  },

  websocket
};


class MyClass{
  echo(message: string): string{
    return message;
  }
  sum(params: { x: number; y: number }): number{
    return params.x + params.y;
  }
}

type Methods = {
  echo(params: { message: string }): string;
  sum(params: { x: number; y: number }): number;
};