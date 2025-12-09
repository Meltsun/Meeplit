import { JSONRPCServer } from "json-rpc-2.0";
import { io, Socket } from "socket.io-client";

// 通过 socket.io 建立与服务端的连接，并把 `obj` 的方法注册到 JSON-RPC server 上。
// 连接建立并且暴露方法后，客户端会向服务端发送一次 `reverse-rpc-ready` 事件表示就绪。
// 返回一个 Promise，当就绪或连接失败/超时时 resolve/reject。该函数不会把 socket 对象暴露给外部。
export function startReverseRPCServer<T extends Record<string, any>>(
    url: string,
    obj: T,
): void {
    const socket: Socket = io(url);

    const server = new JSONRPCServer();

    //----------------交互逻辑-------------------
    for (const key of Object.keys(obj)) {
        const val = (obj as any)[key];
        if (typeof val !== "function") continue;
        // 2. 对应的方法被调用
        server.addMethod(key, async (params?: unknown) => {
            const args = Array.isArray(params) ? params : params === undefined ? [] : [params];
            return (val as Function).apply(obj, args as any[]);
        });
    }

    // 注册批量调用接口：接收 [{method, params}] 的数组，按序执行并返回每个调用的结果或错误
    server.addMethod("reverse-rpc-batch", async (calls?: unknown) => {
        if (!Array.isArray(calls)) throw new Error("reverse-rpc-batch expects an array");
        const results: Array<{ ok: boolean; result?: any; error?: any }> = [];
        let idCounter = 0;
        for (const c of calls as any[]) {
            try {
                const method = c?.method;
                const params = Array.isArray(c?.params) ? c.params : c?.params === undefined ? [] : [c.params];
                const req = { jsonrpc: "2.0", method, params, id: `batch-${++idCounter}` };
                const res = await server.receive(req as any);
                if (res && typeof res === "object") {
                    if ("result" in res) results.push({ ok: true, result: (res as any).result });
                    else results.push({ ok: false, error: (res as any).error });
                } else {
                    // 没有返回（通知或无响应）视为 undefined 结果
                    results.push({ ok: true, result: undefined });
                }
            } catch (err) {
                results.push({ ok: false, error: err });
            }
        }
        return results;
    });

    socket.on("json-rpc", async (data: any) => {
        try {
            if (data && typeof data === "object" && "method" in data) {
                // 1. 收到来自服务端的请求，交给 json-rpc-server 处理
                const response = await server.receive(data);
                // 3. 把响应通过 socket.io 发回服务端
                if (response) socket.emit("json-rpc", response);
            }
        } catch (err) {
            console.error("reverse-rpc client socket handler error:", err);
        }
    });
}