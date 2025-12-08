import { JSONRPCClient } from "json-rpc-2.0";
import type { Socket } from "socket.io";

export type RPCify<T> = {
	[K in keyof T]: T[K] extends (...args: infer A) => infer R
		? R extends Promise<any>
			? (...args: A) => R
			: (...args: A) => Promise<R>
		: never;
};

// 把一个 socket.io 的 `socket` 绑定到 json-rpc client，并返回一个用于远程调用的 stub。
export function createClientStub<T extends Record<string, any>>(socket: Socket): RPCify<T> {
	//------------------交互逻辑-------------------
	//2. json-rpc-client收到请求，通过socket.io发送
	const client = new JSONRPCClient((request) => {
		socket.emit("json-rpc", request);
		return Promise.resolve();
	});

	//3. socket 接收来自服务端的请求,交给 json-rpc-client 处理
	socket.on("json-rpc", (data: any) => {
		try {
			client.receive(data);
		} catch (err) {
			console.error("reverse-rpc server socket handler error:", err);
		}
	});

	//1. 构造一个代理类，调用被委托给json-rpc-client，返回promise
	const handler: ProxyHandler<any> = {
		get(_target, prop) {
			if (typeof prop !== "string") return undefined;
			return (...args: any[]) => client.request(prop, args as any[]);
		},
	};

	const stub = new Proxy({}, handler) as RPCify<T>;

	return stub;
}


