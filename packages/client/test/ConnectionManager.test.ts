import { describe, expect, test } from "bun:test";
import { RPC_BATCH_METHOD_NAME, RPCErrorCode } from "@meeplit/shared/rpc";
import { ConnectionManager } from "../src/game/ConnectionManager";

type RpcHandler = (req: any, meta: any, ack?: (res: any, meta: any) => void) => void;

type SocketStub = {
    on: (event: string, handler: RpcHandler) => void;
    emitWithAck: (event: string, payload: unknown) => Promise<unknown>;
    disconnect: () => void;
};

const createManagerWithSocket = () => {
    const handlers = new Map<string, RpcHandler>();
    const socket: SocketStub = {
        on: (event:any, handler:any) => {
            handlers.set(event, handler);
        },
        emitWithAck: async () => undefined,
        disconnect: () => {
            /* noop */
        },
    } as any;

    const manager = new ConnectionManager();
    (manager as any).socket = socket;

    return { manager, handlers, socket };
};

describe("ConnectionManager exposeRpcObject", () => {
    test("invokes target methods and returns results via ack", async () => {
        const { manager, handlers } = createManagerWithSocket();
        const target = {
            add: (a: number, b: number) => a + b,
        };

        manager.exposeRpcObject(target);

        const rpc = handlers.get("rpc");
        expect(rpc).toBeDefined();

        const ackPayload = await new Promise<any>((resolve) => {
            rpc?.({ method: "add", params: [1, 2] }, { returnMode: "call" }, (res) => {
                resolve(res);
            });
        });

        expect(ackPayload.error).toBeUndefined();
        expect(ackPayload.result).toBe(3);
    });

    test("coerces undefined return values to null", async () => {
        const { manager, handlers } = createManagerWithSocket();
        const target = {
            voidReturn: () => undefined,
        };

        manager.exposeRpcObject(target);
        const rpc = handlers.get("rpc");
        expect(rpc).toBeDefined();

        const ackPayload = await new Promise<any>((resolve) => {
            rpc?.({ method: "voidReturn", params: [] }, { returnMode: "call" }, (res) => {
                resolve(res);
            });
        });

        expect(ackPayload.error).toBeUndefined();
        expect(ackPayload.result).toBeNull();
    });

    test("handles batch calls sequentially", async () => {
        const { manager, handlers } = createManagerWithSocket();
        const target = {
            add: (a: number, b: number) => a + b,
            voidReturn: () => undefined,
        };

        manager.exposeRpcObject(target);
        const rpc = handlers.get("rpc");
        expect(rpc).toBeDefined();

        const ackPayload = await new Promise<any>((resolve) => {
            rpc?.(
                {
                    method: RPC_BATCH_METHOD_NAME,
                    params: [
                        "sequential",
                        [
                            { method: "add", params: [1, 1] },
                            { method: "voidReturn", params: [] },
                        ],
                    ],
                },
                { returnMode: "call" },
                (res) => {
                    resolve(res);
                }
            );
        });

        const batchResult = ackPayload.result;
        expect(Array.isArray(batchResult)).toBe(true);
        expect(batchResult[0]?.result).toBe(2);
        expect(batchResult[0]?.error).toBeUndefined();
        expect(batchResult[1]?.result).toBeNull();
        expect(batchResult[1]?.error).toBeUndefined();
    });

    test("returns invalid request error for malformed payloads", async () => {
        const { manager, handlers } = createManagerWithSocket();
        const target = {};

        manager.exposeRpcObject(target);
        const rpc = handlers.get("rpc");
        expect(rpc).toBeDefined();

        const ackPayload = await new Promise<any>((resolve) => {
            rpc?.({ not: "a rpc request" } as any, { returnMode: "call" }, (res) => {
                resolve(res);
            });
        });

        expect(ackPayload.error?.code).toBe(RPCErrorCode.InvalidRequest);
    });
});

describe("ConnectionManager sendChatMessage", () => {
    test("delegates to socket emitWithAck", async () => {
        const { manager, socket } = createManagerWithSocket();
        let emittedEvent: string | undefined;
        let emittedPayload: unknown;

        (socket as any).emitWithAck = async (event: string, payload: unknown) => {
            emittedEvent = event;
            emittedPayload = payload;
        };

        await manager.sendChatMessage("hello");

        expect(emittedEvent).toBe("chat");
        expect(emittedPayload).toBe("hello");
    });
});
