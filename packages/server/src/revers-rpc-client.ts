import { JSONRPCClient } from "json-rpc-2.0";
import type { Socket } from "socket.io";

// 将方法签名转为返回 Promise 的 RPC 形式
export type RPCify<T> = {
	[K in keyof T]: T[K] extends (...args: infer A) => infer R
		? R extends Promise<any>
			? (...args: A) => R
			: (...args: A) => Promise<R>
		: never;
};

// 缓冲代理：方法立即返回 void（同步），将调用加入队列
export type Bufferedify<T> = {
	[K in keyof T]: T[K] extends (...args: infer A) => any ? (...args: A) => void : never;
};

// 提取方法的“awaited”返回类型
type AwaitedReturn<F> = F extends (...a: any[]) => infer R ? R extends Promise<infer U> ? U : R : never;

export interface BufferedController<T> {
	proxy: Bufferedify<T>;
	flushAll(): Promise<Array<{ ok: boolean; result?: any; error?: any }>>;
	flushLast(): Promise<any>;
	clear(): void;
	size(): number;
}

export type ReverseRpcStub<T> = RPCify<T> & { buffered: BufferedController<T> };

// 把一个 socket.io 的 `socket` 绑定到 json-rpc client，并返回一个用于远程调用的 stub。
// 新增：在返回的 stub 上可通过 `stub.buffered` 访问缓冲 API（手动 flush）。
export function createClientStub<T extends Record<string, any>>(socket: Socket): ReverseRpcStub<T> {
	//------------------交互逻辑-------------------
	const client = new JSONRPCClient((request) => {
		socket.emit("json-rpc", request);
		return Promise.resolve();
	});

	socket.on("json-rpc", (data: any) => {
		try {
			client.receive(data);
		} catch (err) {
			console.error("reverse-rpc server socket handler error:", err);
		}
	});

	//------------------缓冲逻辑-------------------
	const queue: Array<{ method: string; params: any[] }> = [];

	function clear() {
		queue.length = 0;
	}

	function size() {
		return queue.length;
	}

	// flushAll: 发送批量请求到浏览器端，返回服务端实现的结果数组
	async function flushAll() {
		const batch = queue.splice(0, queue.length);
		if (batch.length === 0) return [] as Array<{ ok: boolean; result?: any; error?: any }>;
		const resp = await client.request('reverse-rpc-batch', batch);
		return resp as Array<{ ok: boolean; result?: any; error?: any }>;
	}

	// flushLast: 返回最后一个调用的结果或抛出其错误
	async function flushLast() {
		const results = await flushAll();
		if (results.length === 0) return undefined;
		const last = results[results.length - 1];
		if (!last) return undefined;
		if (!last.ok) throw last.error;
		return last.result;
	}

	// buffered proxy：将方法调用加入队列并立即返回 void
	const bufferedProxyHandler: ProxyHandler<any> = {
		get(_t, prop) {
			if (typeof prop !== 'string') return undefined;
			return (...args: any[]) => {
				queue.push({ method: prop, params: args });
			};
		}
	};

	const bufferedObj = {
		proxy: new Proxy({}, bufferedProxyHandler) as Bufferedify<T>,
		flushAll,
		flushLast,
		clear,
		size
	} as BufferedController<T>;

	//------------------正常 RPC stub-------------------
	const handler: ProxyHandler<any> = {
		get(_target, prop) {
			if (prop === 'buffered') return bufferedObj;
			if (typeof prop !== 'string') return undefined;
			return (...args: any[]) => client.request(prop, args as any[]);
		},
	};

	const stub = new Proxy({}, handler) as RPCify<T> & { buffered: BufferedController<T> };

	return stub;
}


