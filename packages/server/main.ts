import { Server } from "socket.io";
import { Server as Engine } from "@socket.io/bun-engine";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { CLIENT_ORIGIN, WS_HOST, WS_PORT, WS_URL } from "./src/env";
import { createClientStub } from "./src/revers-rpc-client";
import type {ReverseRpcStub} from "./src/revers-rpc-client";


console.log('Server will bind WS on', WS_HOST, WS_PORT, 'ws-url', WS_URL);

const socketio_server = new Server();
const engine = new Engine({
  cors: {
    origin: CLIENT_ORIGIN,
    credentials: true,
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type"],
  },
});

socketio_server.bind(engine);

const app = new Hono();

app.use('*', cors());

const { websocket } = engine.handler();
const server = Bun.serve({
  port: WS_PORT,
  idleTimeout: 30,
  fetch(req:Request, server:Bun.Server<any>) {
    const url = new URL(req.url);
    if (url.pathname === "/socket.io/") {
      return engine.handleRequest(req, server);
    }
    return app.fetch(req, server);
  },
  websocket
});

let stub:undefined|ReverseRpcStub<Console>;

socketio_server.on("connection", async (socket) => {
  console.log("Reverse RPC client connected", socket.id);
  stub = createClientStub<Console>(socket);  
  await stub.log("success")
  console.log("success")
});