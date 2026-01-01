import { Server } from "socket.io";
import { Server as Engine } from "@socket.io/bun-engine";
import { Hono } from "hono";
import { cors } from "hono/cors";
import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

import { CLIENT_ORIGIN, WS_HOST, WS_PORT, WS_URL } from "./src/env";
import { BrowserObjectCallServer } from "./src/browserObjectCallServer";

import type { GameService } from "@meeplit/client"

console.log('Server will bind WS on', WS_HOST, WS_PORT, 'ws-url', WS_URL);

const socketioServer = new Server();
const engine = new Engine({
    cors: {
        origin: CLIENT_ORIGIN,
        credentials: true,
        methods: ["GET", "POST", "OPTIONS"],
        allowedHeaders: ["Content-Type"],
    },
});

socketioServer.bind(engine);

const app = new Hono();

app.use('*', cors());

const { websocket } = engine.handler();

Bun.serve({
    port: WS_PORT,
    idleTimeout: 30,
    fetch(req: Request, server: Bun.Server<any>) {
        const url = new URL(req.url);
        if (url.pathname === "/socket.io/") {
            return engine.handleRequest(req, server);
        }
        return app.fetch(req, server);
    },
    websocket
});
let server!: BrowserObjectCallServer<GameService>;

export default server

socketioServer.on("connection", async (socket) => {
    console.log("Reverse RPC client connected", socket.id);
    server = new BrowserObjectCallServer(socket);
    test()
});

async function test() {

    let s = await server.callBatch({
            executionMode: "sequential",
            timeout: 99999*1000,
            defaultResult: "未选择"
        },
        (stub)=>{
            stub.ping()
            stub.setGameInfo("13123213")
            return stub.ask({
                    prompt:"你是谁？",
                    choices:["Alice", "Bob", "Charlie"],
                    timeoutMs:15*1000,
                    defaultChoiceIndex:0
                }
            )
        }
    )
    console.log("结果",s);
}