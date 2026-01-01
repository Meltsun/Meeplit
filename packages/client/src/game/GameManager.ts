import { io, Socket } from "socket.io-client";
import { RPCErrorCode, RpcResponse,ServerToClientEvents,ClientToServerEvents,RpcRequest,BatchRpcquestParams} from "@meeplit/shared";

export class GameManager{
    private socket: Socket<ServerToClientEvents,ClientToServerEvents>;

    constructor(url: string){
        this.socket = io(url);
    }

    public disconnect(): void {
        this.socket.disconnect();
    }

    exposeRpcObject(target:Record<string, any>): void {
        this.socket.on("rpc-request", async (req, ack) => {
            if(ack===undefined || typeof ack !== "function"){
                console.error(`rpc-request缺少ack ${req}`);
                return
            }
            try {
                const res = await safeCallMethod(target, req);
                if(res.error) console.error("reverse-rpc error:", res.error.message);
                ack(res);
            } catch (err) {
                console.error("reverse-rpc client socket handler error:", err);
                ack(RpcResponse.fail(RPCErrorCode.InternalError, (err as Error).message));
            }
        });

        this.socket.on("rpc-emit", async (req) => {
            try {
                const res = await safeCallMethod(target, req);
                if(res.error) console.error("reverse-rpc error:", res.error.message);
            } catch (err) {
                console.error("reverse-rpc client socket handler error:", err);
            }
        })
    }

    private sendChatMessage(message: string): void {
        this.socket.emit("chat", message);
    }
}

async function safeCallMethod(target:Record<string, any>,req:unknown):Promise<RpcResponse> {
    if(!isRpcRequest(req)){
        console.warn(`rpc-request缺少ack,按照emit执行`);
        return RpcResponse.fail(RPCErrorCode.InvalidRequest, `Invalid request: 请求格式错误${req}`)
    }
    let fn = findMethod(target, req.method);
    if(!fn){
        return RpcResponse.fail(RPCErrorCode.MethodNotFound, `Method not found: 找不到方法 ${req.method}`)
    }
    try {
        const res = await fn(...req.params);
        return RpcResponse.success(res);
    } catch (e) {
        return RpcResponse.fail(RPCErrorCode.ServiceError, (e as Error).message);
    }
}

async function batchCall(
    target: Record<string, any>,
    ...params:any[]
): Promise<RpcResponse<any[]|null>> {
    if(!isBatchRpcRequests(params)){
        return RpcResponse.fail(RPCErrorCode.InvalidRequest, `Invalid batch request: 请求格式错误`)
    }
    const [executionMode, reqs] = params;
    if(executionMode === 'parallel'){
        const promises = reqs.map((req) => safeCallMethod(target, req));
        const results = await Promise.all(promises);
        return RpcResponse.success(results);
    }else{// sequential
        const results: Array<RpcResponse> = [];
        for (const req of reqs) {
            results.push(await safeCallMethod(target, req))
        }
        return RpcResponse.success(results);
    }
}

function findMethod(
    target: Record<string, any>,
    methodName: string
): Function|null {
    if(methodName === import.meta.env.VITE_RPC_BATCH){
        return (...params:any[])=>batchCall(target, ...params);
    }
    const segments = methodName
        .split(".")
        .map((s) => s.trim())
        .filter(Boolean);
    
    let thisArg: any = target;

    for (let i = 0; i < segments.length; i += 1) {
        const segment = segments[i];
        if (BLACKLIST.has(segment)) return null;
        if (!isTraversableObject(thisArg)) return null;
        if (!(segment in thisArg)) return null;

        const value = (thisArg as any)[segment];

        if (i === segments.length - 1) {
            if (typeof value === "function") {
                return value.bind(thisArg);
            }
            return null;
        }

        thisArg = value;
    }

    return null;
}

const BLACKLIST = new Set([
    "__proto__", "prototype", 
    "constructor",
    "__defineGetter__","__defineSetter__","__lookupGetter__","__lookupSetter__",
    "then",
    "toStringTag"
])

// 仅允许在对象/函数上继续向下取属性，避免 null/基础类型
const isTraversableObject = (value: any): value is Record<string, any> | Function => {
    const t = typeof value;
    return (t === "object" || t === "function") && value !== null;
};

function isRpcRequest(rpcRequest: unknown):rpcRequest is RpcRequest {
    if (typeof rpcRequest !== "object" || rpcRequest === null) return false;
    if (typeof (rpcRequest as any).method !== "string") return false;
    if (!Array.isArray((rpcRequest as any).params)) return false;
    return true;
}

function isBatchRpcRequests(params: any[]):params is BatchRpcquestParams{
    if (params.length!==2) return false;
    if (params[0]!=='sequential' && params[0]!=='parallel') return false;
    if (!Array.isArray(params[1])) return false;
    for (const r of params[1]){
        if(!isRpcRequest(r)) return false;
    }
    return true
}