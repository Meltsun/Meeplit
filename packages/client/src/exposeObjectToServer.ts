import { io, Socket } from "socket.io-client";
import { ObjectCallRPCServer } from "@meeplit/object-call-rpc";

// 通过 socket.io 建立与服务端的连接，并把 `obj` 的方法注册到 JSON-RPC server 上。
// 连接建立并且暴露方法后，客户端会向服务端发送一次 `reverse-rpc-ready` 事件表示就绪。
// 返回一个 Promise，当就绪或连接失败/超时时 resolve/reject。该函数不会把 socket 对象暴露给外部。
export function exposeObjectToServer<T extends Record<string, any>>(
    url: string,
    obj: T,
): void {
    const socket: Socket = io(url);

    const server = new ObjectCallRPCServer(obj);

    socket.on("json-rpc", async (data: any) => {
        try {
            if (data && typeof data === "object" && "method" in data) {
                const response = await server.receive(data);
                if (response) socket.emit("json-rpc", response);
            }
        } catch (err) {
            console.error("reverse-rpc client socket handler error:", err);
        }
    });
}