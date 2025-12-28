import { JSONRPCClient,createJSONRPCErrorResponse} from "json-rpc-2.0";
import type {CreateID, JSONRPCResponse, SendRequest,JSONRPCErrorResponse} from "json-rpc-2.0";

export type { JSONRPCResponse } from "json-rpc-2.0";

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

export interface StubOptions {
    emit?: boolean;
    timeout?: number;
    default?: any;
}

export class ObjectCallRPCClient<T extends Record<string, any>> extends JSONRPCClient{
    private defaultOptions: Required<StubOptions>;

    constructor(_send: SendRequest<void>, defaultOptions: Required<StubOptions>, createID?: CreateID | undefined){
        super(_send, createID);
        this.defaultOptions = defaultOptions;
    }

    // requestSequence: 发射有序批量方法
    async requestSequence(queue: Array<RpcRequest>):Promise<JSONRPCResponse[]>{
        if (queue.length === 0) return [];
        let res:JSONRPCResponse[] = await this.request("rpc.buffered", queue);
        return res;
    }

    public getStub(options: StubOptions & { emit: false }): RPCify_noEmit<T>;
    public getStub(options?: StubOptions): RPCify<T>;
    public getStub(options?: StubOptions): RPCify_noEmit<T> | RPCify<T> {
        const finalOptions = { ...this.defaultOptions, ...options };
        return this.createStubProxy([], finalOptions);
    }

    private createStubProxy(path: string[], options: Required<StubOptions>): any {
        const fnTarget = function () { /* callable for apply trap */ };
        return new Proxy(fnTarget, {
            get: (_t, prop) => {
                if (typeof prop !== "string") return undefined;
                return this.createStubProxy([...path, prop], options);
            },
            apply: (_t, _thisArg, params) => {
                if (!path.length) return Promise.reject(new Error("Method path is empty"));
                const method = `.${path.join(".")}`;
                
                if (options.emit) {
                    return this
                        .timeout(
                            options.timeout,
                            (id)=> {
                                const response =  createJSONRPCErrorResponse(id, -1, "Request timed out")
                                response.result = options.default;
                                return response
                            }
                        )
                        .request(method, params);
                } else {
                    return {
                        method: method,
                        params: params
                    } as RpcRequest
                }
            },
        });
    }
}


export interface JSONRPCTimeoutErrorResponse extends JSONRPCErrorResponse {
    defaultResult: any;
}