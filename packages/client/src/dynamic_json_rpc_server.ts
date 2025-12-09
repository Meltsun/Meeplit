import {
    JSONRPCRequest,
    JSONRPCResponse,
    JSONRPCParams,
    JSONRPCID,
    JSONRPCErrorCode,
    JSONRPCErrorException,
    createJSONRPCErrorResponse,
    createJSONRPCSuccessResponse,
    isJSONRPCRequest,
    isJSONRPCID,
    JSONRPCErrorResponse,
    JSONRPCSuccessResponse,
    ErrorListener,
} from "json-rpc-2.0";
import type {
    JSONRPCServerMiddleware,
    JSONRPCServerMiddlewareNext,
    JSONRPCServerOptions,
} from "json-rpc-2.0";

export type JSONRPCResponsePromise = PromiseLike<JSONRPCResponse | null>;

export interface DynamicJSONRPCServerOptions extends JSONRPCServerOptions {
    delimiter?: string;
    blacklist?: string[];
}

const createParseErrorResponse = (): JSONRPCResponse =>
    createJSONRPCErrorResponse(null, JSONRPCErrorCode.ParseError, "Parse error");

const createInvalidRequestResponse = (request: any): JSONRPCResponse =>
    createJSONRPCErrorResponse(
        isJSONRPCID(request.id) ? request.id : null,
        JSONRPCErrorCode.InvalidRequest,
        "Invalid Request"
    );

const createMethodNotFoundResponse = (id: JSONRPCID): JSONRPCResponse =>
    createJSONRPCErrorResponse(
        id,
        JSONRPCErrorCode.MethodNotFound,
        "Method not found"
    );

// 动态分派时的安全黑名单，阻止越权访问原型链
const defaultBlacklist = ["__proto__", "prototype", "constructor"];

const isNonNull = <T>(value: T | null): value is T => value !== null;

const noopMiddleware: JSONRPCServerMiddleware<any> = (
    next,
    request,
    serverParams
) => next(request, serverParams);

const mapResultToJSONRPCResponse = (
    id: JSONRPCID | undefined,
    result: any
): JSONRPCSuccessResponse | null => {
    if (id !== undefined) {
        return createJSONRPCSuccessResponse(id, result);
    }
    return null;
};

const defaultMapErrorToJSONRPCErrorResponse = (
    id: JSONRPCID,
    error: any
): JSONRPCErrorResponse => {
    let message: string = error?.message ?? "An unexpected error occurred";
    let code: number = 0;
    let data: any;

    if (error instanceof JSONRPCErrorException) {
        code = error.code;
        data = error.data;
    }

    return createJSONRPCErrorResponse(id, code, message, data);
};

const mapResponse = (
    request: JSONRPCRequest,
    response: JSONRPCResponse | null
): JSONRPCResponse | null => {
    if (response) {
        return response;
    }
    if (request.id !== undefined) {
        return createJSONRPCErrorResponse(
            request.id,
            JSONRPCErrorCode.InternalError,
            "Internal error"
        );
    }
    return null;
};

// 兼容 json-rpc-2.0 的参数规则：标量→单元素数组，未提供→空数组
const normalizeParams = (params: JSONRPCParams): any[] => {
    if (Array.isArray(params)) return params;
    if (params === undefined) return [];
    return [params];
};

// 仅允许在对象/函数上继续向下取属性，避免 null/基础类型
const isTraversableObject = (value: any): value is Record<string, any> | Function => {
    const t = typeof value;
    return (t === "object" || t === "function") && value !== null;
};

export class DynamicJSONRPCServer<
    ServerParams = void,
    T extends Record<string, any> = Record<string, any>
> {
    private readonly target: T;
    private readonly delimiter: string;
    private readonly blacklist: Set<string>;
    private middleware: JSONRPCServerMiddleware<ServerParams> | null;
    private readonly errorListener: ErrorListener;

    public mapErrorToJSONRPCErrorResponse: (
        id: JSONRPCID,
        error: any
    ) => JSONRPCErrorResponse = defaultMapErrorToJSONRPCErrorResponse;

    constructor(target: T, options: DynamicJSONRPCServerOptions = {}) {
        this.target = target;
        // 支持点分路径（可配置分隔符）以启用 stub.a.b.c() 调用
        this.delimiter = options.delimiter ?? ".";
        // 合并默认黑名单与用户传入黑名单
        this.blacklist = new Set([...
            defaultBlacklist,
        ...(options.blacklist ?? []),
        ]);
        this.middleware = null;
        this.errorListener = options.errorListener ?? console.warn;
    }

    receiveJSON(
        json: string,
        serverParams?: ServerParams
    ): PromiseLike<JSONRPCResponse | JSONRPCResponse[] | null> {
        const request: JSONRPCRequest | JSONRPCRequest[] | null =
            this.tryParseRequestJSON(json);
        if (request) {
            return this.receive(request, serverParams);
        }
        return Promise.resolve(createParseErrorResponse());
    }

    private tryParseRequestJSON(json: string): JSONRPCRequest | null {
        try {
            return JSON.parse(json);
        } catch {
            return null;
        }
    }

    receive(
        request: JSONRPCRequest,
        serverParams?: ServerParams
    ): PromiseLike<JSONRPCResponse | null>;
    receive(
        request: JSONRPCRequest | JSONRPCRequest[],
        serverParams?: ServerParams
    ): PromiseLike<JSONRPCResponse | JSONRPCResponse[] | null>;
    receive(
        request: JSONRPCRequest | JSONRPCRequest[],
        serverParams?: ServerParams
    ): PromiseLike<JSONRPCResponse | JSONRPCResponse[] | null> {
        if (Array.isArray(request)) {
            return this.receiveMultiple(request, serverParams);
        }
        return this.receiveSingle(request, serverParams);
    }

    private async receiveMultiple(
        requests: JSONRPCRequest[],
        serverParams?: ServerParams
    ): Promise<JSONRPCResponse | JSONRPCResponse[] | null> {
        const responses: JSONRPCResponse[] = (
            await Promise.all(
                requests.map((request) => this.receiveSingle(request, serverParams))
            )
        ).filter(isNonNull);

        if (responses.length === 1) {
            return responses[0];
        }
        if (responses.length) {
            return responses;
        }
        return null;
    }

    private async receiveSingle(
        request: JSONRPCRequest,
        serverParams?: ServerParams
    ): Promise<JSONRPCResponse | null> {
        if (!isJSONRPCRequest(request)) {
            return createInvalidRequestResponse(request);
        }

        const response: JSONRPCResponse | null = await this.callMethod(
            request,
            serverParams
        );
        return mapResponse(request, response);
    }

    applyMiddleware(
        ...middlewares: JSONRPCServerMiddleware<ServerParams>[]
    ): void {
        if (this.middleware) {
            this.middleware = this.combineMiddlewares([
                this.middleware,
                ...middlewares,
            ]);
        } else {
            this.middleware = this.combineMiddlewares(middlewares);
        }
    }

    private combineMiddlewares(
        middlewares: JSONRPCServerMiddleware<ServerParams>[]
    ): JSONRPCServerMiddleware<ServerParams> | null {
        if (!middlewares.length) {
            return null;
        }
        return middlewares.reduce(this.middlewareReducer);
    }

    private middlewareReducer(
        prevMiddleware: JSONRPCServerMiddleware<ServerParams>,
        nextMiddleware: JSONRPCServerMiddleware<ServerParams>
    ): JSONRPCServerMiddleware<ServerParams> {
        return (
            next: JSONRPCServerMiddlewareNext<ServerParams>,
            request: JSONRPCRequest,
            serverParams: ServerParams
        ): JSONRPCResponsePromise => {
            return prevMiddleware(
                (request, serverParams) => nextMiddleware(next, request, serverParams),
                request,
                serverParams
            );
        };
    }

    private callMethod(
        request: JSONRPCRequest,
        serverParams: ServerParams | undefined
    ): JSONRPCResponsePromise {
        // 特殊控制方法：批量缓冲调用，method 固定为 rpc.buffered
        if (request.method === "rpc.buffered") {
            return this.handleBuffered(request, serverParams);
        }

        const callMethod: JSONRPCServerMiddlewareNext<ServerParams> = (
            request: JSONRPCRequest,
            _serverParams: ServerParams
        ): JSONRPCResponsePromise => {
            // 动态解析 method 路径，不再依赖预注册表
            const resolved = this.resolveMethod(request.method);
            if (!resolved) {
                if (request.id !== undefined) {
                    return Promise.resolve(createMethodNotFoundResponse(request.id));
                }
                return Promise.resolve(null);
            }

            // 参数归一化后执行目标函数
            const args = normalizeParams(request.params as JSONRPCParams);
            const { fn, thisArg } = resolved;
            const result = fn.apply(thisArg, args);
            return Promise.resolve(result).then((value) =>
                mapResultToJSONRPCResponse(request.id, value)
            );
        };

        const onError = (error: any): JSONRPCResponsePromise => {
            this.errorListener(
                `An unexpected error occurred while executing "${request.method}" JSON-RPC method:`,
                error
            );
            return Promise.resolve(
                this.mapErrorToJSONRPCErrorResponseIfNecessary(request.id, error)
            );
        };

        try {
            return (this.middleware || noopMiddleware)(
                callMethod,
                request,
                serverParams as ServerParams
            ).then(undefined, onError);
        } catch (error) {
            return onError(error);
        }
    }

    private mapErrorToJSONRPCErrorResponseIfNecessary(
        id: JSONRPCID | undefined,
        error: any
    ): JSONRPCErrorResponse | null {
        if (id !== undefined) {
            return this.mapErrorToJSONRPCErrorResponse(id, error);
        }
        return null;
    }

    // 批量缓冲执行：params 形如 [{ method, params }]，复用现有 callMethod 逻辑逐条执行
    private async handleBuffered(
        request: JSONRPCRequest,
        serverParams: ServerParams | undefined
    ): Promise<JSONRPCResponse | null> {
        const id = request.id;
        if (id === undefined) return null;

        if (!Array.isArray(request.params)) {
            if (id === undefined) return null;
            return createJSONRPCErrorResponse(
                id,
                JSONRPCErrorCode.InvalidParams,
                "rpc.buffered expects an array of calls"
            );
        }

        const calls = request.params as Array<{ method?: string; params?: JSONRPCParams }>;
        const results: Array<{ ok: boolean; result?: any; error?: any }> = [];

        for (let i = 0; i < calls.length; i += 1) {
            const c = calls[i];
            if (!c || typeof c.method !== "string") {
                results.push({
                    ok: false,
                    error: {
                        code: JSONRPCErrorCode.InvalidRequest,
                        message: "rpc.buffered call is invalid",
                    },
                });
                continue;
            }

            const subRequest: JSONRPCRequest = {
                jsonrpc: "2.0",
                method: c.method,
                params: c.params,
                id: `buffered-${i + 1}`,
            };

            try {
                const subResponse = await this.callMethod(subRequest, serverParams);
                if (!subResponse) {
                    results.push({ ok: true, result: undefined });
                } else if ("result" in subResponse) {
                    results.push({ ok: true, result: subResponse.result });
                } else {
                    results.push({ ok: false, error: subResponse.error });
                }
            } catch (error) {
                results.push({
                    ok: false,
                    error: {
                        code: JSONRPCErrorCode.InternalError,
                        message: (error as any)?.message ?? "Internal error",
                    },
                });
            }
        }

        return createJSONRPCSuccessResponse(id, results);
    }

    // 将 "a.b.c" 解析为 target.a.b.c，并返回函数及 this 绑定
    private resolveMethod(
        methodName: string
    ): { fn: Function; thisArg: any } | null {
        const segments = methodName
            .split(this.delimiter)
            .map((s) => s.trim())
            .filter(Boolean);

        if (!segments.length) return null;

        let cursor: any = this.target;

        for (let i = 0; i < segments.length; i += 1) {
            const segment = segments[i];
            if (this.blacklist.has(segment)) return null;
            if (!isTraversableObject(cursor)) return null;
            if (!Object.prototype.hasOwnProperty.call(cursor, segment)) return null;

            const value = (cursor as any)[segment];
            const isLast = i === segments.length - 1;

            if (isLast) {
                if (typeof value === "function") {
                    return { fn: value, thisArg: cursor };
                }
                return null;
            }

            cursor = value;
        }

        return null;
    }
}
