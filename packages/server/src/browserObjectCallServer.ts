import type { Socket } from "socket.io";
import {ObjectCallRPCClient} from "@meeplit/object-call-rpc";
import type {RPCify, RPCify_noEmit,RpcRequest,JSONRPCResponse } from "@meeplit/object-call-rpc";

// 调用浏览器对象的 stub：
// - 方法名现在带前导点（.a.b.c）以匹配对象路径
// - 提供缓冲调用接口
export class BrowserObjectCallServer<T extends Record<string, any>> {
	private readonly client: ObjectCallRPCClient<T>;
	stub_noEmit: RPCify_noEmit<T>;
	stub: RPCify<T>;

	requestSequence(queue: Array<RpcRequest>):Promise<JSONRPCResponse[]>{
		return this.client.requestSequence(queue)
	}
	
	constructor(socket: Socket) {
		this.client = new ObjectCallRPCClient((request) => {
			socket.emit("rpc", request);
			return Promise.resolve();
		});	

		socket.on("rpc", (data: any) => {
			try {
				this.client.receive(data);
			} catch (err) {
				console.error("reverse-rpc server socket handler error:", err);
			}
		});
		this.stub_noEmit = this.client.stub_noEmit;
		// stub 会在存在缓冲时触发 flushLast，否则单次调用
		this.stub = this.client.stub;
	}

}


