import { io, Socket } from "socket.io-client";
import { RPC_BATCH_METHOD_NAME,RPCErrorCode, RpcResponse,ServerToClientEvents,ClientToServerEvents,RpcRequest,BatchRpcquestParams, RpcError} from "@meeplit/shared/rpc"

export class ConnectionManager{
    private socket!: Socket<ServerToClientEvents,ClientToServerEvents>;

    public connect(url:string): void {
        this.socket = io(url)
    }

    public disconnect(): void {
        if(this.socket){
            this.socket.disconnect();
        }
    }

    exposeRpcObject(target:Record<string, any>): void {
        this.socket.on("rpc-call", async (req, ack) => {
            if(ack===undefined || typeof ack !== "function"){
                console.error(`rpc-call缺少ack ${req}`);
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

    public async sendChatMessage(message: string): Promise<void> {
        await this.socket.emitWithAck("chat", message);
        return
    }
}

// 安全调用方法，捕获异常并返回RpcResponse
async function safeCallMethod(target:Record<string, any>,req:unknown):Promise<RpcResponse> {
    if(!isRpcRequest(req)){
        console.warn(`rpc-call缺少ack,按照emit执行`);
        return RpcResponse.fail(RPCErrorCode.InvalidRequest, `Invalid request: 请求格式错误${req}`)
    }
    let fn = findMethod(target, req.method) as (...args:any[])=>unknown;
    if(!fn){
        return RpcResponse.fail(RPCErrorCode.MethodNotFound, `Method not found: 找不到方法 ${req.method}`)
    }
    try {
        let result = await fn(...req.params);
        if(result === undefined) result = null; // 避免ack丢失
        return RpcResponse.success(result);
    } catch (e) {
        return RpcResponse.fail(RPCErrorCode.ServiceError, (e as Error).message);
    }
}

async function batchCall(
    target: Record<string, any>,
    ...params:any[]
): Promise<Array<RpcResponse>> {
    if(!isBatchRpcRequests(params)){
        throw new RpcError(RPCErrorCode.InvalidRequest,`Invalid batch request: 请求格式错误`)
    }
    const [executionMode, reqs] = params;
    if(executionMode === 'parallel'){
        const promises = reqs.map((req) => safeCallMethod(target, req));
        const results = await Promise.all(promises);
        return results;
    }else{// sequential
        const results: Array<RpcResponse> = [];
        for (const req of reqs) {
            const res=await safeCallMethod(target, req)
            results.push(res)
        }
        return results;
    }
}

function findMethod(
    target: Record<string, any>,
    methodName: string
): Function|null {
    if(methodName === RPC_BATCH_METHOD_NAME){
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