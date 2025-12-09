import { JSONRPCClient } from "json-rpc-2.0";
import type { Socket } from "socket.io";

// 递归将方法转为 Promise 形式，支持 stub.a.b.c()
export type RPCify<T> = T extends (...args: infer A) => infer R
	? (...args: A) => Promise<Awaited<R>>
	: T extends object
		? { [K in keyof T]: RPCify<T[K]> }
		: never;



// 缓冲代理：递归映射，调用时仅入队不等待
export type Bufferedify<T> = T extends (...args: infer A) => any
	? (...args: A) => void
	: T extends object
		? { [K in keyof T]: Bufferedify<T[K]> }
		: never;

export interface BufferedController<T> {
	proxy: Bufferedify<T>;
	flushAll(): Promise<Array<{ ok: boolean; result?: any; error?: any }>>;
	flushLast(): Promise<any>;
	clear(): void;
	size(): number;
}

// 调用浏览器对象的stub，用法相同，只是：
// 1. 只能调用函数，不能取值
// 2. 所有调用均返回 Promise
type ReverseRpcStub<T> = RPCify<T> & {
	buffered: BufferedController<T>;
};

// 把一个 socket.io 的 `socket` 绑定到 json-rpc client，并返回一个用于远程调用的 stub。
// 新增：在返回的 stub 上可通过 `stub.buffered` 访问缓冲 API（手动 flush）。
export function createBrowserObjectStub<T extends Record<string, any>>(socket: Socket): ReverseRpcStub<T> {
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
		const resp = await client.request('rpc.buffered', batch);
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

	// buffered proxy：递归生成，调用时入队
	const makeBufferedProxy = (path: string[]): any => {
		const fnTarget = function () { /* callable for apply trap */ };
		return new Proxy(fnTarget, {
			get(_t, prop) {
				if (typeof prop !== 'string') return undefined;
				return makeBufferedProxy([...path, prop]);
			},
			apply(_t, _thisArg, argArray) {
				if (!path.length) return undefined;
				queue.push({ method: path.join('.'), params: argArray as any[] });
				return undefined;
			}
		});
	};

	const bufferedObj = {
		proxy: makeBufferedProxy([]) as Bufferedify<T>,
		flushAll,
		flushLast,
		clear,
		size
	} as BufferedController<T>;

	//------------------正常 RPC stub-------------------
	const makeInvokeProxy = (path: string[]): any => {
		const fnTarget = function () { /* callable for apply trap */ };
		return new Proxy(fnTarget, {
			get(_t, prop) {
				if (prop === 'buffered' && path.length === 0) return bufferedObj;
				if (typeof prop !== 'string') return undefined;
				return makeInvokeProxy([...path, prop]);
			},
			apply(_t, _thisArg, argArray) {
				if (!path.length) return Promise.reject(new Error('Method path is empty'));
				const method = path.join('.');
				return client.request(method, argArray as any[]);
			}
		});
	};

	const stub = makeInvokeProxy([]) as ReverseRpcStub<T>

	return stub;
}


