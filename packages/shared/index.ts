export enum RPCErrorCode {
    MethodNotFound,	//找不到要调用的方法
    ServiceError,	//处理请求时发生错误
	InternalError, // Rpc内部发生了未知错误
	InvalidRequest  //无效的请求
}

export class RpcError extends Error {
	public code: RPCErrorCode;

	constructor(code: RPCErrorCode, message?: string) {
		super(message);
		this.name = 'RpcError';
		this.code = code;
    }
}

export type MultiRpcParams =[ 'sequential' | 'parallel', RpcRequest[] ]
export type RpcRequest = {
	method: string;
	params: any[];
};

export class RpcResponse<R=any>{
	private constructor(
		public res:R,
		public err?:{
			code:number,
			message?:string
		}
	){}
	public static success<R>(res:R):RpcResponse<R>{
		return new RpcResponse<R>(res);
	}
	public static fail(code:RPCErrorCode, message?:string):RpcResponse<null>{
		return new RpcResponse(null, {code, message});
	}
}

export interface ServerToClientEvents{
    "rpc-request": (req:RpcRequest,ack:(res:RpcResponse)=>void) => void;
	"rpc-emit": (req:RpcRequest) => void;
    "chat": (message: string) => void;
}

export interface ClientToServerEvents {
    "chat": (message: string) => void;
}
