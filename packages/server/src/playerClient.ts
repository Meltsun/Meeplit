import type { Socket } from "socket.io";
import { RPC_BATCH_METHOD_NAME, BatchRpcquest, ClientToServerEvents, RPCErrorCode, RpcError, RpcRequest,RpcResponse, ServerToClientEvents } from "@meeplit/shared/rpc";

type NoInfer<T> = [T][T extends any ? 0 : never];

// RPC stub，相比原类型没有属性，所有方法都返回 Promise
export type RPCify_Request<T> = T extends (...args: infer A) => infer R
    ? (...args: A) => Promise<Awaited<R>>
    : T extends object
        ? { [K in keyof T]: RPCify_Request<T[K]> }
        : never;

// RPC 缓冲stub，相比原类型没有属性，所有方法都返回描述符，供后续批量调用
export type RPCify_Reserve<T> = T extends (...args: infer A) => infer R
	? (...args: A) => RpcRequest<string, A, Awaited<R>>
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

// 处理响应，提取结果或抛出错误
function handleResponse(
	req: RpcRequest,
	response: unknown,
	defaultResult: unknown
){
	console.log(response)
	try {
		if (response === null || response === undefined)
			throw new RpcError(RPCErrorCode.InvalidRequest, `响应为空${response}`);

		if (typeof response !== "object")
			throw new RpcError(RPCErrorCode.InvalidRequest, `响应不是对象${response}`);

		const resObj = response as Record<string, unknown>;
		const error = resObj.error;
		if (error !== undefined) {
			if (typeof error === "object" && error !== null) {
				const code = (error as { code?: unknown }).code;
				const message = (error as { message?: unknown }).message;
				if (typeof code === "number") {
					throw new RpcError(
						code as RPCErrorCode,
						typeof message === "string" ? message : undefined
					);
				}
			}
			throw new RpcError(
				RPCErrorCode.InvalidRequest,
				`响应的error字段格式错误${response}`
			);
		}

		if ("result" in resObj) {
			const result = (resObj as { result: unknown }).result;
			if (result === undefined) return defaultResult;
			return result;
		}

		throw new RpcError(
			RPCErrorCode.InvalidRequest,
			`响应缺少result字段${response}`
		);
	} catch (e) {
		if (e instanceof RpcError) {
			switch (e.code) {
				case RPCErrorCode.MethodNotFound:
					console.warn("方法未找到", req.method);
					break;
				case RPCErrorCode.ServiceError:
					console.warn(`运行Target${req.method}时出现错误`, e.message);
					break;
				case RPCErrorCode.InvalidRequest:
					console.warn("收到无效响应", e.message);
					break;
			}
		} else if (e instanceof Error){
			console.warn("未知错误", e.message);
		}
		return defaultResult;
	}
}

export class PlayerClient<T extends Record<string, any>> {
	constructor(
		private socket: Socket<ClientToServerEvents,ServerToClientEvents>,
	){}

	public handleRequest<R = any>(
		req:RpcRequest<string, any[], R>,
		options:{
			returnMode:"call",
			timeout:number,
			defaultResult?:R,
		}):Promise<R>
	public handleRequest(
		req:RpcRequest,
		options:{
			returnMode:'emit'|'reserve',
			defaultResult?:any,
			timeout?:number
		}):RpcRequest;
	public handleRequest(
		req:RpcRequest,
		options:{
			returnMode:'emit'| "call"|'reserve',
			defaultResult?:any,
			timeout?:number
		}
		): Promise<any>|RpcRequest {
		if(options.returnMode==='emit'){
			this.socket.emit("rpc-emit",req);
			return req
		} else if(options.returnMode==='reserve'){
			return req;
		} else if(options.returnMode==="call"){
			if (!options.timeout) throw new Error("request模式必须指定timeout参数");
			return (async()=>{
				let res: unknown;
				try{
					res = await this.socket.timeout(options.timeout as number).emitWithAck("rpc-call",req)
				}catch(e){
					const hasDefault = options.defaultResult !== undefined;
					if(e instanceof Error){
						const isTimeout = e.message?.toLowerCase().includes("timeout");
						if(isTimeout){
							console.info(`客户端输入超时，使用默认结果返回Target${req.method}`);
						}else{
							console.warn("Socket.io 错误", e.message);
						}
					}
					if(hasDefault) return options.defaultResult as any;
					throw e;
				}
				return handleResponse(req,res,options.defaultResult)
			})()
		}else{
			throw new Error(`未知的returnMode ${options.returnMode}`);
		}
	}
	
	public batchAdvanced<R>(
		options:{
			executionMode: 'sequential' | 'parallel',
			returnMode:'emit'| "call"|'reserve',
			defaultResult?:R,
			timeout?:number,
		},
		batchCtx:(stub:RPCify_Reserve<T>)=>RpcRequest<string, any[], R>|null|void|undefined
		):BatchRpcquest|Promise<R|RpcResponse[]>{
		if (options.returnMode==="call" && !options.timeout) throw new Error("request模式必须指定timeout参数");
		const reqs:RpcRequest[] = [];
	
		const batchCallback = <RReturn>(req: RpcRequest<string, any[], RReturn>) =>{
			reqs.push(req);
			return req;
		}
		const markedReq = batchCtx(createChainCollectorProxy([], batchCallback) as RPCify_Reserve<T>);

		const batchReq={
			method: RPC_BATCH_METHOD_NAME,
			params: [options.executionMode,reqs]
		} as BatchRpcquest;

		if(options.returnMode==="call"){
			const result = this.handleRequest(batchReq, options as any) as Promise<RpcResponse[]>;
			return (async()=>{
				const batchRes = await result;
				if(markedReq){
					const idx = reqs.indexOf(markedReq);
					const res=batchRes[idx] as RpcResponse<any>
					if(idx>=0) return handleResponse(markedReq,res,options.defaultResult) as R;
					throw new Error(
						"请返回一个发送请求以接收对应结果, 或者返回undefined|void|null以接收全部结果",
					);
				}
				return batchRes;
			})() as Promise<R|RpcResponse[]>;
		}

		this.handleRequest(batchReq, options as any);
		return batchReq;
	}

	public singleAdvanced(
		options:{
			returnMode:'emit'| "call"|'reserve',
			defaultResult?:any,
			timeout?:number
		}
	):RPCify<T>|RPCify_Reserve<T>|RPCify_Request<T>{
		if (options.returnMode==="call" && !options.timeout ) throw new Error("request模式必须指定timeout参数");
		return createChainCollectorProxy([], (req)=>this.handleRequest(req,options as any)) as RPCify_Reserve<T>;
	}

	//直接发送请求，不返回
	public emit():RPCify_Reserve<T>{
		return this.singleAdvanced({returnMode:'emit'}) as RPCify_Reserve<T>;
	}

	//发送请求，等待结果返回；如果defaultResult是真值，且发生超时等异常或返回值为undefined，则返回defaultResult
	public call(timeout:number,defaultResult:any):RPCify_Request<T>{
		return this.singleAdvanced({returnMode:"call",timeout,defaultResult}) as RPCify_Request<T>;
    }

	public emitBatch(executionMode: 'sequential' | 'parallel',batchCtx:(stub:RPCify_Reserve<T>)=>any):RpcRequest{
		return this.batchAdvanced(
			{
				executionMode,
				returnMode:"emit"
			},
			batchCtx
		) as RpcRequest;
	}

	public async callBatch<R>(options:{
			executionMode: 'sequential' | 'parallel',
			timeout:number,
			defaultResult: NoInfer<R>
		},
		batchCtx:(stub:RPCify_Reserve<T>)=>(RpcRequest<string, any[], R>)
	):Promise<R>{
		return this.batchAdvanced(
			{
				...options,
				returnMode:"call"
			},
			batchCtx
		) as Promise<R>;
	}
}



