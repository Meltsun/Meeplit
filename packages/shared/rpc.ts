import "reflect-metadata";

export const RPC_BATCH_METHOD_NAME = 'rpc-batch';

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

export type BatchRpcquestParams =[ 'sequential' | 'parallel', RpcRequest[] ]

// Phantom generic R carries the expected return type for type inference only.
// __return is optional and never used at runtime.
export type RpcRequest<
	M extends string = string,
	P extends any[] = any[],
	R = unknown
> = {
	method: M;
	params: P;
	__return?: R;
};

export type BatchRpcquest = RpcRequest<'rpc-batch',BatchRpcquestParams>;

export type RpcReturnMode = 'emit' | 'call';

export type RpcRequestMeta = {
	returnMode: RpcReturnMode;
};

// 预留扩展返回的元信息，目前为空结构
export type RpcResponseMeta = Record<string, never>;

export class RpcResponse<R=any>{
	private constructor(
		public result:R,
		public error?:{
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

export type BatchRpcResponse= RpcResponse<RpcResponse[]>;

export interface ServerToClientEvents{
	"rpc": (req:RpcRequest, reqMeta: RpcRequestMeta, ack?: (res:RpcResponse, resMeta: RpcResponseMeta)=>void) => void;
	"chat": (message: string) => void;
}

export interface ClientToServerEvents {
    "chat": (message: string,ack:()=>void) => void;
}


type RevivableCtor<T = any> = abstract new (...args: any[]) => T;
const REVIVABLE_META_KEY = "revivable:enabled";

const REVIVE_TYPE_KEY = "__revive_type";
const reviveRegistry = new Map<string, RevivableCtor>();

function ensureMetadata(ctor: RevivableCtor){
	try{
		Reflect.defineMetadata(REVIVABLE_META_KEY, true, ctor);
	}catch(_e){
		// Reflect metadata not available; best-effort fallback
	}
}

function registerRevivable(ctor: RevivableCtor){
	const typeName = ctor?.name;
	if (!typeName) return;
	ensureMetadata(ctor);
	if (!reviveRegistry.has(typeName)) reviveRegistry.set(typeName, ctor);
}

function annotateRevivable(value: any): any {
	if (Array.isArray(value)) {
		for (let i = 0; i < value.length; i += 1) {
			value[i] = annotateRevivable(value[i]);
		}
		return value;
	}

	if (!value || typeof value !== "object") return value;

	const maybeCtor = (value as { constructor?: RevivableCtor }).constructor;
	const maybeCtorName = maybeCtor?.name;
	const hasMeta = (()=>{
		try{
			return maybeCtor ? Reflect.getMetadata(REVIVABLE_META_KEY, maybeCtor) : false;
		}catch(_e){
			return false;
		}
	})();

	if (maybeCtorName && (reviveRegistry.has(maybeCtorName) || hasMeta)) {
		// Ensure subclasses of abstract revivable bases are registered on first encounter
		if (!reviveRegistry.has(maybeCtorName)) registerRevivable(maybeCtor as RevivableCtor);
		(value as Record<string, unknown>)[REVIVE_TYPE_KEY] = maybeCtorName;
	}

	for (const key of Object.keys(value as Record<string, unknown>)) {
		(value as Record<string, unknown>)[key] = annotateRevivable((value as Record<string, unknown>)[key]);
	}

	return value;
}

function reviveValue<T>(value: T): T {
	if (Array.isArray(value)) return value.map((item) => reviveValue(item)) as unknown as T;
	if (!value || typeof value !== "object") return value;

	const raw = value as Record<string, unknown>;
	const reviveType = raw[REVIVE_TYPE_KEY];
	if (typeof reviveType === "string" && reviveRegistry.has(reviveType)) {
		const ctor = reviveRegistry.get(reviveType) as RevivableCtor;
		const instance = Object.create(ctor.prototype) as Record<string, unknown>;
		for (const key of Object.keys(raw)) {
			if (key === REVIVE_TYPE_KEY) continue;
			instance[key] = reviveValue(raw[key]);
		}
		return instance as T;
	}

	for (const key of Object.keys(raw)) {
		raw[key] = reviveValue(raw[key]);
	}

	return value;
}

export function Revivable<T extends RevivableCtor>(Base: T): void {
	// Only attach metadata; actual注册发生在 markRevivablePayload 时的 annotateRevivable
	ensureMetadata(Base);
}

export function markRevivablePayload<T>(value: T): T {
	return annotateRevivable(value);
}

export function reviveRehydratedValue<T>(value: T): T {
	return reviveValue(value);
}
