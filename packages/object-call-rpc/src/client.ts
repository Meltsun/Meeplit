import { JSONRPCClient,createJSONRPCErrorResponse,JSONRPCError,JSONRPCErrorException} from "json-rpc-2.0";
import type {CreateID, JSONRPCResponse, SendRequest} from "json-rpc-2.0";
export type { JSONRPCResponse } from "json-rpc-2.0";

// 在首参数为对象时，增加可选 timeout，便于传递超时设置

type MakeOptional<T, K extends PropertyKey> =
  K extends keyof T
    ? Omit<T, K> & Partial<Pick<T, K>>
    : T

type MakeFirstParamsTimeoutOptional<A extends any[]> = A extends [infer F, ...infer R]
    ? F extends object ? [MakeOptional<F,'timeout'>, ...R] : A
    : A;

// RPC stub，相比原类型没有属性，所有方法都返回 Promise
export type RPCify<T> = T extends (...args: infer A) => infer R
    ? (...args: MakeFirstParamsTimeoutOptional<A>) => Promise<Awaited<R>>
    : T extends object
        ? { [K in keyof T]: RPCify<T[K]> }
        : never;

// RPC 缓冲stub，相比原类型没有属性，所有方法都返回描述符，供后续批量调用
export type RPCify_noEmit<T> = T extends (...args: infer A) => any
    ? (...args: MakeFirstParamsTimeoutOptional<A>) => RpcRequest<MakeFirstParamsTimeoutOptional<A>>
    : T extends object
        ? { [K in keyof T]: RPCify_noEmit<T[K]> }
        : never;

export type RpcRequest<T extends any[] = any[]> = {
	method: string;
	params: T;
};

export interface StubOptions<ClientParams=void> {
    emit?: boolean;
    timeout: number;
    defaultResult?: any;
    clientParams?: ClientParams;
}

export class ObjectCallRPCClient<T extends Record<string, any>,ClientParams = void> extends JSONRPCClient<ClientParams> {
    private options;

    constructor(_send: SendRequest<ClientParams>, additionalTimeOut:number,clientParams:ClientParams, createID?: CreateID | undefined){
        super(_send, createID);
        this.options = {
            clientParams:clientParams,
            additionalTimeOut:additionalTimeOut
        } 
    }

    // 一次请求包含多个方法，按顺序执行
    public async requestSequence(queue: Array<RpcRequest>,timeout:number,defaultResult:any=undefined):Promise<JSONRPCResponse[]>{
        if (queue.length === 0) return [];
        let res:JSONRPCResponse[] = await this.request("rpc.buffered", queue,undefined as unknown as ClientParams,timeout,defaultResult);
        return res;
    } 

    public getStub(options: StubOptions<ClientParams> & { emit: false }): RPCify_noEmit<T>;
    public getStub(options?: StubOptions<ClientParams>): RPCify<T>;
    public getStub(options?: StubOptions<ClientParams>): RPCify<T> | RPCify_noEmit<T> {
        let finalOptions = {
            emit: true,
            timeout: 10 * 1000,
            defaultResult: undefined,
            ...this.options,
            ...options
        }
        return this.createStubProxy([], finalOptions);
    }

    
    public override async request(method:string, params:any,clientParams: ClientParams,timeout?:number,defaultResult?:any):Promise<any>{
        try{
            if(timeout && timeout > 0){
                return await this
                    .timeout(
                        timeout+ this.options.additionalTimeOut,
                        (id) => createJSONRPCErrorResponse(id, timeoutWithDefaultErrorCode, "Request timed out")
                    )
                    .request(method, params, clientParams)
            }
            else{
                return super.request(method, params,clientParams);
            }

        }catch(e){
            if (defaultResult !== undefined) {
                if(e instanceof JSONRPCErrorException && e.code === timeoutWithDefaultErrorCode){
                    console.log("Request timed out, returning default result.");
                }else if(e instanceof Error){
                    console.log("Error in request:", e.message)
                }else{
                    console.log("Error in request:", e)
                }
                return defaultResult;
            }
            throw e;
        }
    }

    private createStubProxy(path: string[], options: Required<StubOptions<ClientParams>>): any {
        const fnTarget = function () { /* callable for apply trap */ };
        return new Proxy(fnTarget, {
            get: (_t, prop) => {
                if (typeof prop !== "string") return undefined;
                return this.createStubProxy([...path, prop], options);
            },
            apply: (_t, _thisArg, params) => {
                if (!path.length) return Promise.reject(new Error("Method path is empty"));
                const method = `.${path.join(".")}`;
                params = this.addTimeoutIfPossible(params, options.timeout);
                if (options.emit) {
                    return this.request(method,params,options.clientParams,options.timeout,options.defaultResult);
                }
                else {
                    return {method, params: params} as RpcRequest<typeof params>;
                }
            }
        })
    }

    // add timeout to the first params object when appropriate so remote handlers can respect it
    private addTimeoutIfPossible<P extends any[]>(params: P, timeout: number | undefined): P {
        if (timeout === undefined || params.length === 0) return params;
        const [first, ...rest] = params;
        if (!this.isPlainObject(first)) return params;
        if ("timeout" in (first as Record<string, unknown>)) return params;
        const patchedFirst = { ...(first as Record<string, unknown>), timeout };
        return [patchedFirst, ...rest] as unknown as P;
    }

    private isPlainObject(value: unknown): value is Record<string, unknown> {
        if (value === null) return false;
        if (typeof value !== "object") return false;
        const proto = Object.getPrototypeOf(value);
        return proto === Object.prototype || proto === null;
    }
}

const timeoutWithDefaultErrorCode = -10000;