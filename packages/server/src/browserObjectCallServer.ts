import type { Socket } from "socket.io";
import { RPC_BATCH,BatchRpcResponse, BatchRpcquest, ClientToServerEvents, RPCErrorCode, RpcError, RpcRequest,RpcResponse, ServerToClientEvents } from "@meeplit/shared";

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

function handleResponse<R,T>(
	req:RpcRequest,
	{result ,error }:RpcResponse<R>,
	defaultResult:T
):R|T
{
	try{
		if(error) throw new RpcError(error.code,error.message);
		if(result===undefined) return defaultResult;
		return result;
	}catch(e){
		if (e instanceof Error) {
			if (e instanceof RpcError) {
				switch (e.code) {
					case RPCErrorCode.MethodNotFound:
						console.warn("方法未找到", req.method);
						break;
					case RPCErrorCode.ServiceError:
						console.warn(`运行Target${req.method}时出现错误`, e.message);
						break;
				}
			}else{
				console.warn("Socket.io 错误", e.message);
			}
		}
		if (defaultResult) {
			console.info(`客户端输入超时，使用默认结果返回Target${req.method}`);
			return defaultResult;
		}
		throw e;
	}
}

export class BrowserObjectCallServer<T extends Record<string, any>> {
	constructor(
		private socket: Socket<ClientToServerEvents,ServerToClientEvents>,
	){}

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
			returnMode:'emit'|'reserve',
			defaultResult?:any,
			timeout?:any
		}):RpcRequest;
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
				return handleResponse(req,await this.socket.timeout(options.timeout).emitWithAck("rpc-request",req),options.defaultResult)
			})()
		}else{
			throw new Error(`未知的returnMode ${options.returnMode}`);
		}
	}
	
	public batchAdvanced<R>(
		options:{
			executionMode: 'sequential' | 'parallel',
			returnMode:'emit'| 'request'|'reserve',
			defaultResult?:any,
			timeout?:any,
		},
		batchCtx:(stub:RPCify_Request<T>)=>Promise<R>|null|void|undefined
	):BatchRpcquest|Promise<BatchRpcResponse>|Promise<R>{
		if (options.returnMode==='request' && !options.timeout) throw new Error("request模式必须指定timeout参数");
		const reqs:RpcRequest[] = [];
		
		const batchCallback = (req:RpcRequest) =>{
			reqs.push(req);
			const p = Promise.reject(Error("batch模式下不要await stub调用，请直接return调用结果")) as Promise<never> & { __rpcRequest: RpcRequest };
			p.catch(() => {}); // mark handled to avoid unhandled rejection noise
			(p as any).__rpcRequest = req;
			return p;
		}
		const markedReq = (batchCtx(createChainCollectorProxy([], batchCallback)) as any).__rpcRequest as RpcRequest

		const batchReq={
			method: RPC_BATCH,
			params: [options.executionMode,reqs]
		} as BatchRpcquest;

		if(options.returnMode==='request'){
			const result = this.handleRequest(batchReq, options as any) as Promise<BatchRpcResponse>;
			return (async()=>{
				const res = await result;
				if(markedReq){
					const idx = reqs.indexOf(markedReq);
					if(idx>=0) return handleResponse(markedReq,res.result[idx],options.defaultResult);
					throw new Error(
						"请返回一个发送请求以接收对应结果, 或者返回undefined|void|null以接收全部结果",
					);
				}
				return res.result;
			})() as Promise<R>;
		}

		this.handleRequest(batchReq, options as any);
		return batchReq;
	}

	public singleAdvanced(
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
		return this.singleAdvanced({returnMode:'emit'}) as RPCify_Reserve<T>;
	}

	//发送请求，等待结果返回；如果defaultResult是真值，且发生超时等异常或返回值为undefined，则返回defaultResult
	public request(timeout:number,defaultResult:any):RPCify_Request<T>{
		return this.singleAdvanced({returnMode:'request',timeout,defaultResult}) as RPCify_Request<T>;
    }

	public emitBatch(executionMode: 'sequential' | 'parallel',batchCtx:(stub:RPCify_Request<T>)=>any):RpcRequest{
		return this.batchAdvanced(
			{
				executionMode,
				returnMode:"emit"
			},
			batchCtx
		) as RpcRequest;
	}

	public async requestBatch<R>(options:{
			executionMode: 'sequential' | 'parallel',
			timeout:number,
			defaultResult:R
		},
		batchCtx:(stub:RPCify_Request<T>)=>Promise<R>
	):Promise<R>{
		return this.batchAdvanced(
			{
				...options,
				returnMode:"request"
			},
			batchCtx
		) as Promise<R>;
	}
}



