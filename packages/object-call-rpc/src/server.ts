import {createJSONRPCErrorResponse, JSONRPCErrorCode, JSONRPCParams, JSONRPCRequest, JSONRPCResponse, JSONRPCServer,JSONRPCServerOptions} from "json-rpc-2.0";

export interface ObjectCallRPCServerOptions extends JSONRPCServerOptions {
    delimiter?: string;
    blacklist?: string[];
}
const defaultBlacklist = ["__proto__", "prototype", "constructor"];

export class ObjectCallRPCServer<
    ServerParams = void,
    T extends Record<string, any> = Record<string, any>
> extends JSONRPCServer<ServerParams> {
    private readonly delimiter: string;
    private readonly blacklist: Set<string>;
    private target: T;

    constructor(target:T,options:ObjectCallRPCServerOptions = {}) {
        super(options);
        this.target = target;
        this.delimiter = options.delimiter ?? ".";
        // 合并默认黑名单与用户传入黑名单
        this.blacklist = new Set([...
            defaultBlacklist,
        ...(options.blacklist ?? []),
        ]);
        this.addMethod("rpc.buffered", (params, serverParams)=>this.handleBuffered(params, serverParams));
    }

    override receive(
        request: JSONRPCRequest,
        serverParams?: ServerParams
    ): PromiseLike<JSONRPCResponse | null>;
    override receive(
        request: JSONRPCRequest | JSONRPCRequest[],
        serverParams?: ServerParams
    ): PromiseLike<JSONRPCResponse | JSONRPCResponse[] | null>;
    override receive(
        request: JSONRPCRequest | JSONRPCRequest[],
        serverParams?: ServerParams
    ): PromiseLike<JSONRPCResponse | JSONRPCResponse[] | null> {
        let methods :string[] = [];
        if (!Array.isArray(request)) {
            methods.push(request.method);
        }
        else {
            for (const req of request) {
                methods.push(req.method);
            }
        }
        methods.filter(method=>method.length>0 && method[0]===this.delimiter && !this.hasMethod(method))
            .forEach((method)=>{
                const resolved = this.resolveMethod(method);
                if (resolved){
                    const { fn, thisArg } = resolved;
                    this.addMethod(method,(params, serverParams)=>fn.apply(thisArg,normalizeParams(params as JSONRPCParams)))
                }
            })
        return super.receive(request,serverParams)
    }

    private async handleBuffered(
        params: any,
        serverParams: ServerParams | undefined
    ): Promise<JSONRPCResponse[]> {
        if (!Array.isArray(params)) {
            throw new Error(
                "rpc.buffered expects an array of calls"
            );
        }

        const calls = params as Array<{ method?: string; params?: JSONRPCParams }>;
        const results: Array<JSONRPCResponse> = [];

        for (let i = 0; i < calls.length; i += 1) {
            const c = calls[i];
            let id = `buffered-${i + 1}`
            if (!c || typeof c.method !== "string") {
                results.push(createJSONRPCErrorResponse(
                    id,
                    JSONRPCErrorCode.InvalidRequest,
                    'invalid call in buffered request',
                ));
                continue;
            }

            const subRequest: JSONRPCRequest = {
                jsonrpc: "2.0",
                method: c.method,
                params: c.params,
                id: `buffered-${i + 1}`,
            };

            try {
                const subResponse = await this.receive(subRequest, serverParams);
                if (subResponse) {
                    results.push(subResponse);
                } else {
                    results.push(createJSONRPCErrorResponse(
                        id,
                        JSONRPCErrorCode.InternalError,
                        "no response for buffered call",
                    ))
                }
            } catch (error) {
                results.push(createJSONRPCErrorResponse(
                    id,
                    JSONRPCErrorCode.InternalError,
                    "Internal error",
                ));
            }
        }
        return results;
    }
    // 将 "a.b.c" 解析为 target.a.b.c，并返回函数及 this 绑定
    private resolveMethod(
        methodName: string
    ): { fn: Function; thisArg: any } | null {
        const segments = methodName
            .split(this.delimiter)
            .map((s) => s.trim())
            .filter(Boolean);
        let cursor: any = this.target;
        for (const segment of segments) {
            if (this.blacklist.has(segment)) return null;
            if (!isTraversableObject(cursor)) return null;
            if (!Object.prototype.hasOwnProperty.call(cursor, segment)) return null;
            cursor = (cursor as any)[segment];
        }

        if (segments.length >=1 && typeof cursor === "function") {
            return { fn: cursor, thisArg: cursor };
        }
        return null;
    }
}

// 仅允许在对象/函数上继续向下取属性，避免 null/基础类型
const isTraversableObject = (value: any): value is Record<string, any> | Function => {
    const t = typeof value;
    return (t === "object" || t === "function") && value !== null;
};

// 兼容 json-rpc-2.0 的参数规则：标量→单元素数组，未提供→空数组
const normalizeParams = (params: JSONRPCParams): any[] => {
    if (Array.isArray(params)) return params;
    if (params === undefined) return [];
    return [params];
};