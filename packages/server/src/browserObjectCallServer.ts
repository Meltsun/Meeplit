import type { Socket } from "socket.io";
import { ClientToServerEvents, RPCErrorCode, RpcError, RpcRequest,RpcResponse, ServerToClientEvents } from "@meeplit/shared";
import { RPC_BATCH } from "./env";
// RPC stub，相比原类型没有属性，所有方法都返回 Promise
export type RPCify_Request<T> = T extends (...args: infer A) => infer R
    ? (...args: A) => Promise<Awaited<R>>
    : T extends object
        ? { [K in keyof T]: RPCify_Request<T[K]> }
        : never;

// RPC 缓冲stub，相比原类型没有属性，所有方法都返回描述符，供后续批量调用
export type RPCify_Reserve<T> = T extends (...args: infer A) => any
    ? (...args: A) => RpcRequest
    : T extends object
        ? { [K in keyof T]: RPCify_Reserve<T[K]> }
        : never;

export type RPCify<T> = T extends (...args: infer A) => infer R
    ? (...args: A) => any
    : T extends object
        ? { [K in keyof T]: RPCify<T[K]> }
        : never;

function createChainCollectorProxy<T>(
	path: string[], 
	callback:(req:RpcRequest)=>any
): RPCify<T> {
	const fnTarget = function () { /* callable for apply trap */ };
	return new Proxy(fnTarget, {
		get: (_t, prop) => {
			if (typeof prop !== "string") return undefined;
			return createChainCollectorProxy([...path, prop],callback);
		},
		apply: (_t, _thisArg, params) => {
			if (!path.length) return Promise.reject(new Error("Method path is empty"));
			const method = `.${path.join(".")}`;
			return callback({method, params});
		}
	}) as RPCify<T>
}


export class BrowserObjectCallServer<T extends Record<string, any>> {
	constructor(
		private socket: Socket<ClientToServerEvents,ServerToClientEvents>,
		private name="Target"
	){}

	public handleRequest(
		req:RpcRequest,
		options:{
			returnMode:'emit'|'reserve',
			defaultResult?:any,
			timeout?:any
		}):RpcRequest;
	public handleRequest(
		req:RpcRequest,
		options:{
			returnMode:'request',
			timeout:any
			defaultResult?:any,
		}):Promise<RpcResponse>
	public handleRequest(
		req:RpcRequest,
		options:{
			returnMode:'emit'| 'request'|'reserve',
			defaultResult?:any,
			timeout?:any
		}
	): Promise<RpcResponse>|RpcRequest {
		if(options.returnMode==='emit'){
			this.socket.emit("rpc-emit",req);
			return req
		} else if(options.returnMode==='reserve'){
			return req;
		} else if(options.returnMode==='request'){
			return (async()=>{
				try{
					const {res,err}:RpcResponse= await this.socket.timeout(options.timeout).emitWithAck("rpc-request",req);
					if(err) throw new RpcError(err.code,err.message);
					if(res===undefined) return options.defaultResult;
					return res;
				}catch(e){
					if (e instanceof Error) {
						if (e instanceof RpcError) {
							switch (e.code) {
								case RPCErrorCode.MethodNotFound:
									console.warn("方法未找到", req.method);
									break;
								case RPCErrorCode.ServiceError:
									console.warn(`运行${this.name}${req.method}时出现错误`, e.message);
									break;
							}
						}else{
							console.warn("Socket.io 错误", e.message);
						}
					}
					if (options.defaultResult) {
						console.info(`客户端输入超时，使用默认结果返回 ${this.name}${req.method}`);
						return options.defaultResult;
					}
					throw e;
				}
			})()
		}else{
			throw new Error(`未知的returnMode ${options.returnMode}`);
		}
	}

	public batch(
		options:{
			executionMode: 'sequential' | 'parallel',
			returnMode:'emit'| 'request'|'reserve',
			defaultResult?:any,
			timeout?:any,
		},
		callback:(stub:RPCify_Reserve<T>)=>any
	):Promise<RpcResponse>|RpcRequest{
		if (options.returnMode==='request' && !options.timeout ) throw new Error("request模式必须指定timeout参数");
		const reqs:RpcRequest[] = [];
		
		const batchCallback = (req:RpcRequest) =>{
			reqs.push(req);
			return req;
		}
		callback(createChainCollectorProxy([], batchCallback));
		const req={
			method: RPC_BATCH,
			params: [options.executionMode,reqs]
		} as RpcRequest;
		
		return this.handleRequest(req,options as any)
	}

	public single(
		options:{
			returnMode:'emit'| 'request'|'reserve',
			defaultResult?:any,
			timeout?:number
		}
	):RPCify<T>|RPCify_Reserve<T>|RPCify_Request<T>{
		if (options.returnMode==='request' && !options.timeout ) throw new Error("request模式必须指定timeout参数");
		return createChainCollectorProxy([], (req)=>this.handleRequest(req,options as any)) as RPCify_Reserve<T>;
	}

	//直接发送请求，不返回
	public emit():RPCify_Reserve<T>{
		return this.single({returnMode:'emit'}) as RPCify_Reserve<T>;
	}

	//发送请求，等待结果返回；如果defaultResult是真值，且发生超时等异常或返回值为undefined，则返回defaultResult
	public request(timeout:number,defaultResult:any):RPCify_Request<T>{
		return this.single({returnMode:'request',timeout,defaultResult}) as RPCify_Request<T>;
    }
}



