import type { Socket } from "socket.io";
import {CallBrowserRpcClient, type RPCify, type RPCify_noEmit} from "../../call-browser-rpc/client";


// 调用浏览器对象的 stub：
// - 方法名现在带前导点（.a.b.c）以匹配对象路径
// - 提供缓冲调用接口
export class BrowserObjectCallServer<T extends Record<string, any>> {
	private readonly client: CallBrowserRpcClient<T>;
	stub_noEmit: RPCify_noEmit<T>;
	stub: RPCify<T>;
	
	constructor(socket: Socket) {
		this.client = new CallBrowserRpcClient((request) => {
			socket.emit("json-rpc", request);
			return Promise.resolve();
		});	

		socket.on("json-rpc", (data: any) => {
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


