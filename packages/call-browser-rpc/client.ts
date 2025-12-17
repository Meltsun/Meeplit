import { JSONRPCClient} from "json-rpc-2.0";
import type {CreateID, JSONRPCResponse, SendRequest} from "json-rpc-2.0";

// 递归将方法转为 Promise 形式，支持 stub.a.b.c()
export type RPCify<T> = T extends (...args: infer A) => infer R
	? (...args: A) => Promise<Awaited<R>>
	: T extends object
		? { [K in keyof T]: RPCify<T[K]> }
		: never;

// 缓冲代理：递归映射，调用时仅入队不等待
export type RPCify_noEmit<T> = T extends (...args: infer A) => any
	? (...args: A) => RpcRequest<A>
	: T extends object
		? { [K in keyof T]: RPCify_noEmit<T[K]> }
		: never;

export type RpcRequest<T extends any[] = any[]> = {
	method: string;
	params: T;
};

export class CallBrowserRpcClient<T extends Record<string, any>> extends JSONRPCClient{
    public readonly stub_noEmit: RPCify_noEmit<T>;
    public readonly stub: RPCify<T>;
    constructor(_send: SendRequest<void>, createID?: CreateID | undefined){
        super(_send, createID);
        this.stub_noEmit = this.makeNoEmitStub([]) as RPCify_noEmit<T>;
        this.stub = this.makeStub([]) as RPCify<T>;
    }

    // OrderedBatch: 发射有序批量方法
    async OrderedBatch(queue: Array<RpcRequest>):Promise<JSONRPCResponse[]>{
        if (queue.length === 0) return [];
        let res:JSONRPCResponse[] = await this.request("rpc.buffered", queue);
        return res;
    }

    // NoEmitStub：递归生成，不发射只返回描述符
    private makeNoEmitStub(path: string[]): any {
        const fnTarget = function () { /* callable for apply trap */ };
        return new Proxy(fnTarget, {
            get: (_t, prop) => {
                if (typeof prop !== "string") return undefined;
                return this.makeNoEmitStub([...path, prop]);
            },
            apply: (_t, _thisArg, params) => {
                if (!path.length) return undefined;
                const method = `.${path.join(".")}`;
                return {
                    method: method,
                    params: params
                } as RpcRequest
            },
        });
    }

    // 正常stub：递归生成，调用时直接请求（方法名带前导点）
    private makeStub(path: string[]): any {
        const fnTarget = function () { /* callable for apply trap */ };
        return new Proxy(fnTarget, {
            get: (_t, prop) => {
                if (typeof prop !== "string") return undefined;
                return this.makeStub([...path, prop]);
            },
            apply: (_t, _thisArg, params) => {
                if (!path.length) return Promise.reject(new Error("Method path is empty"));
                const method = `.${path.join(".")}`;
                return this.request(method, params);
            },
        });
    }
}