import type { Socket } from "socket.io";
import { RPC_BATCH_METHOD_NAME, BatchRpcquest, ClientToServerEvents, RPCErrorCode, RpcError, RpcRequest,RpcRequestMeta,RpcResponse, RpcResponseMeta, ServerToClientEvents, reviveRehydratedValue, markRevivablePayload} from "@meeplit/shared/rpc";

// RPC stub，相比原类型没有属性，所有方法都返回 Promise
export type RPCify_Request<T,D> = T extends (...args: infer A) => infer R
    ? (...args: A) => Promise<Awaited<R>| D>
    : T extends object
        ? { [K in keyof T]: RPCify_Request<T[K],D> }
        : never;

// RPC 缓冲stub，相比原类型没有属性，所有方法都返回描述符，供后续批量调用
export type RPCify_Reserve<T> = T extends (...args: infer A) => infer R
	? (...args: A) => RpcRequest<string, A, Awaited<R>>
    : T extends object
        ? { [K in keyof T]: RPCify_Reserve<T[K]> }
        : never;

export type RPCify<T,D=any> = RPCify_Reserve<T>|RPCify_Request<T,D>

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
	// console.log(response)
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
			return reviveRehydratedValue(result);
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

function reviveRpcResponse(res: RpcResponse){
	if (res && "result" in res) {
		(res as RpcResponse<any>).result = reviveRehydratedValue((res as RpcResponse<any>).result);
	}
	return res;
}

export class RemoteClient<T extends Record<string, any>> {
	constructor(
		private socket: Socket<ClientToServerEvents,ServerToClientEvents>,
	){
		socket.on("chat", (message: string,ack) => {
			console.log("收到聊天消息:", message);
			ack();
		})
	}

	public handleRequest<R = any>(
		req:RpcRequest<string, any[], R>,
		options:{
			returnMode:"call",
			timeoutMs:number,
			defaultResult?:R,
		}):Promise<R>
	public handleRequest(
		req:RpcRequest,
		options:{
			returnMode:'emit'|'reserve',
			defaultResult?:any,
			timeoutMs?:number
		}):RpcRequest;
	public handleRequest(
		req:RpcRequest,
		options:{
			returnMode:'emit'| "call"|'reserve',
			defaultResult?:any,
			timeoutMs?:number
		}
		): Promise<any>|RpcRequest {
		if(options.returnMode==='reserve'){
			return req;
		}
		markRevivablePayload(req);
		const reqMeta: RpcRequestMeta = { returnMode: options.returnMode } as RpcRequestMeta;
		if(options.returnMode==='emit'){
			this.socket.emit("rpc",req, reqMeta);
			return req
		} else if(options.returnMode==="call"){
			if (!options.timeoutMs) throw new Error("request模式必须指定timeout参数");
			return (async()=>{
				let ackRes: unknown;
				try{
					// @ts-expect-error socket.io 的 emitWithAck 类型推断无法识别可选 ack 的 rpc 事件，运行时可正常工作
					ackRes = await this.socket.timeout(options.timeoutMs as number).emitWithAck("rpc",req, reqMeta)
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
				const [res, _resMeta] = Array.isArray(ackRes) ? ackRes as [RpcResponse, RpcResponseMeta] : [ackRes as RpcResponse, {} as RpcResponseMeta];
				return handleResponse(req,res,options.defaultResult)
			})()
		}else{
			throw new Error(`未知的returnMode ${options.returnMode}`);
		}
	}
	
	public batchAdvanced<R,D>(
		options:{
			executionMode: 'sequential' | 'parallel',
			returnMode:'emit'| "call"|'reserve',
			defaultResult?:D,
			timeoutMs?:number,
		},
		batchCtx:(stub:RPCify_Reserve<T>)=>RpcRequest<string, any[], R>|null|void|undefined
		):BatchRpcquest|Promise<(R|D)|RpcResponse[]>{
		if (options.returnMode==="call" && !options.timeoutMs) throw new Error("request模式必须指定timeout参数");
		const reqs:RpcRequest[] = [];
	
		const batchCallback = <RReturn>(req: RpcRequest<string, any[], RReturn>) =>{
			// 确保批量中的每个子请求也携带可复活标记，避免类实例在子请求中丢失
			markRevivablePayload(req);
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
				const batchRes = (await result).map(reviveRpcResponse);
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

	/**
	 * 获取一个按需发送的 RPC 代理。
	 * - 当 `returnMode` 为 `call` 时，返回的方法调用会返回 `Promise`，并遵循 `timeoutMs` 与 `defaultResult` 的行为。
	 * - 当 `returnMode` 为 `emit` 或 `reserve` 时，返回的是仅收集/发射请求的描述符代理。
	 */
	public singleAdvanced<D>(options:{ returnMode: 'call'; timeoutMs: number; defaultResult?: D }): RPCify_Request<T,D>;
	public singleAdvanced(options:{ returnMode: 'emit' }): RPCify_Reserve<T>;
	public singleAdvanced(options:{ returnMode: 'reserve' }): RPCify_Reserve<T>;
	public singleAdvanced(options:{ returnMode: 'emit'|'reserve'; defaultResult?: any; timeoutMs?: number }): RPCify_Reserve<T>;
	public singleAdvanced<D>(
		options:{
			returnMode:'emit'| 'call'|'reserve',
			defaultResult?:any,
			timeoutMs?:number
		}
	):RPCify_Reserve<T>|RPCify_Request<T,D>{
		if (options.returnMode==='call' && !options.timeoutMs ) throw new Error("request模式必须指定timeout参数");
		return createChainCollectorProxy([], (req)=>this.handleRequest(req,options as any));
	}

	/** 仅收集请求，不立即发送，便于后续批量执行 */
	public reserve():RPCify_Reserve<T>{
		return this.singleAdvanced({returnMode:'reserve'}) as RPCify_Reserve<T>;
	}

	/** 直接发送请求，不等待返回 */
	public emit():RPCify_Reserve<T>{
		return this.singleAdvanced({returnMode:'emit'}) as RPCify_Reserve<T>;
	}

	/**
	 * 发送请求并等待结果；
	 * 若发生超时/异常或返回值为 `undefined`，且提供了 `defaultResult`，则返回该默认值。
	 */
	public call<D>(timeoutMs:number,defaultResult:D):RPCify_Request<T,D>{
		return this.singleAdvanced({returnMode:"call",timeoutMs: timeoutMs,defaultResult}) as RPCify_Request<T,D>;
    }

	/** 批量发送（不等待返回），支持 sequential/parallel 两种执行模式 */
	public emitBatch(executionMode: 'sequential' | 'parallel',batchCtx:(stub:RPCify_Reserve<T>)=>any):RpcRequest{
		return this.batchAdvanced(
			{
				executionMode,
				returnMode:"emit"
			},
			batchCtx
		) as RpcRequest;
	}

	/**
	 * 批量发送并等待返回；
	 * 需要在 `batchCtx` 中返回一个“标记请求”，以只提取该项的结果。
	 */
	public async callBatch<R,D>(options:{
			executionMode: 'sequential' | 'parallel',
			timeoutMs:number,
			defaultResult: D
		},
		batchCtx:(stub:RPCify_Reserve<T>)=>(RpcRequest<string, any[], R>)
	):Promise<R|D>{
		return this.batchAdvanced<R,D>(
			{
				...options,
				returnMode:"call"
			},
			batchCtx
		) as Promise<R|D>;
	}

	/**
	 * 批量发送并返回全部结果（已自动复活 `result` 字段）。
	 * 在 `batchCtx` 中不返回标记请求，仅收集要执行的子请求。
	 */
	public async callBatchAll(options:{
		executionMode: 'sequential' | 'parallel',
		timeoutMs:number,
	},
	batchCtx:(stub:RPCify_Reserve<T>)=>void
	):Promise<RpcResponse[]>{
		const res = await this.batchAdvanced({
			executionMode: options.executionMode,
			timeoutMs: options.timeoutMs,
			returnMode: 'call',
		}, batchCtx);
		return res as RpcResponse[];
	}
}