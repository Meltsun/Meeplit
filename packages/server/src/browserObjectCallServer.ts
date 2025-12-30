import type { Socket } from "socket.io";
import {ObjectCallRPCClient} from "@meeplit/object-call-rpc";
import type {RpcRequest,JSONRPCResponse,StubOptions} from "@meeplit/object-call-rpc";

// 调用浏览器对象的 stub：
// - 方法名现在带前导点（.a.b.c）以匹配对象路径
// - 提供缓冲调用接口
export class BrowserObjectCallServer<T extends Record<string, any>> {
	private readonly client: ObjectCallRPCClient<T,void>;
	public getStub(stubOptions:StubOptions){
		return this.client.getStub(stubOptions)
	}

	requestSequence(queue: Array<RpcRequest>,timeout:number):Promise<JSONRPCResponse[]>{
		return this.client.requestSequence(queue,timeout)
	}
	
	constructor(socket: Socket) {
		this.client = new ObjectCallRPCClient(
			(request) => {
				socket.emit("rpc", request);
			}, 
			10,
			undefined
		);

		socket.on("rpc", (data: any) => {
			try {
				this.client.receive(data);
			} catch (err) {
				console.error("reverse-rpc server socket handler error:", err);
			}
		});
	}
}


