import { io, Socket } from "socket.io-client";
import { ObjectCallRPCServer,JSONRPCRequest, JSONRPCResponse} from "@meeplit/object-call-rpc";

export interface ServerToClientEvents{
    "rpc": (data: JSONRPCRequest) => void;
    "chat": (message: string) => void;
}

export interface ClientToServerEvents {
    "rpc": (data: JSONRPCResponse) => void;
    "chat": (message: string) => void;
}

// 通过 socket.io 建立与服务端的连接，并把 `obj` 的方法注册到 JSON-RPC server 上。
// 连接建立并且暴露方法后，客户端会向服务端发送一次 `reverse-rpc-ready` 事件表示就绪。
// 返回一个 Promise，当就绪或连接失败/超时时 resolve/reject。该函数不会把 socket 对象暴露给外部。

export class GameManager{
    private socket: Socket<ServerToClientEvents,ClientToServerEvents>;
    private target: Record<string, any>;

    constructor(url: string, target:Record<string, any>){
        this.socket = io(url);
        this.target = target;
        this.exposeRpcObject();
    }

    private exposeRpcObject(): void {
        const server = new ObjectCallRPCServer(this.target);
        this.socket.on("rpc", async (data: any) => {
            try {
                const response = await server.receive(data);
                if (response) this.socket.emit("rpc", response);
            } catch (err) {
                console.error("reverse-rpc client socket handler error:", err);
            }
        });
    }

    private sendChatMessage(message: string): void {
        this.socket.emit("chat", message);
    }
}