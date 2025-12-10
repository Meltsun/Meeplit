import { JSONRPCClient} from "json-rpc-2.0";
import type {JSONRPCResponse} from "json-rpc-2.0";
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

// 调用浏览器对象的 stub：
// - 方法名现在带前导点（.a.b.c）以匹配对象路径
// - 提供缓冲调用接口
export class BrowserObjectCallServer<T extends Record<string, any>> {
	private readonly client: JSONRPCClient;
	private readonly queue: Array<{ method: string; params: any[] }> = [];
	public readonly stub: RPCify<T>;
	public readonly stub_buffered: Bufferedify<T>;

	constructor(socket: Socket) {
		this.client = new JSONRPCClient((request) => {
			socket.emit("json-rpc", request);
			return Promise.resolve();
		});

		socket.on("json-rpc", (data: any) => {
			try {
				this.client.receive(data);
			} catch (err) {
				console.error("reverse-rpc server socket handler error:", err);
			}
		});

		const invokeProxy = this.makeInvokeProxy([]);

		this.stub = invokeProxy as RPCify<T>;
		this.stub_buffered = this.makeBufferedProxy([]) as Bufferedify<T>;
	}

	// 清空队列
	clear() {
		this.queue.length = 0;
	}

	// 队列长度
	size() {
		return this.queue.length;
	}

	// flushAll: 发送批量请求到浏览器端，返回结果数组
	async flushAll():Promise<JSONRPCResponse[]>{
		const batch = this.queue.splice(0, this.queue.length);
		if (batch.length === 0) return [];
		let res:JSONRPCResponse[] = await this.client.request("rpc.buffered", batch);
		return res;
	}

	// flushLast: 返回最后一个调用的结果或抛出其错误
	async flushLast() {
		const results = await this.flushAll();
		if (results.length === 0) return undefined;
		const last = results[results.length - 1];
		if (!last) return undefined;
		return last.result;
	}

	// buffered proxy：递归生成，调用时入队（方法名带前导点）
	private makeBufferedProxy(path: string[]): any {
		const fnTarget = function () { /* callable for apply trap */ };
		return new Proxy(fnTarget, {
			get: (_t, prop) => {
				if (typeof prop !== "string") return undefined;
				return this.makeBufferedProxy([...path, prop]);
			},
			apply: (_t, _thisArg, argArray) => {
				if (!path.length) return undefined;
				const method = `.${path.join(".")}`;
				this.queue.push({ method, params: argArray as any[] });
				return undefined;
			},
		});
	}

	// 正常调用 proxy：递归生成，调用时直接请求（方法名带前导点）
	private makeInvokeProxy(path: string[]): any {
		const fnTarget = function () { /* callable for apply trap */ };
		return new Proxy(fnTarget, {
			get: (_t, prop) => {
				if (typeof prop !== "string") return undefined;
				return this.makeInvokeProxy([...path, prop]);
			},
			apply: (_t, _thisArg, argArray) => {
				if (!path.length) return Promise.reject(new Error("Method path is empty"));
				const method = `.${path.join(".")}`;
				return this.client.request(method, argArray as any[]);
			},
		});
	}
}


