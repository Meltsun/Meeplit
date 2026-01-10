import { Server } from "socket.io";
import { Server as Engine } from "@socket.io/bun-engine";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { serveStatic } from "hono/bun";
import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

import { CLIENT_ORIGIN, WS_HOST, WS_PORT, WS_URL } from "./src/env";
import { RemoteClient } from "./src/playerClient";
import * as Cards from "./src/game";

import type GameService from "@meeplit/client"

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

app.use('/assets/*', serveStatic({ root:"D:/Script/Meeplit/packages" }));
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
let player!: RemoteClient<GameService>;

export default player

socketioServer.on("connection", async (socket) => {
    console.log("Reverse RPC client connected", socket.id);
    player = new RemoteClient(socket);
    // test()
});

async function test() {
    const cards=[new Cards.TestCard(1),new Cards.TestCard(2),new Cards.TestCard(3)]
    player.emit().updateCard(cards)
    player.emit().setGameInfo("选择3张牌")
    const c=await player.call(15000,[] as Cards.TestCard[]).playCard({cardnum:1,timeoutMs:10000})
    for(const card of c){
        card.play();
    }
}