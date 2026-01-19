import { describe, expect, test } from "bun:test";
import { RemoteClient } from "../src/playerClient";
import type { RpcRequest, RpcRequestMeta } from "@meeplit/shared/rpc";

type EmitWithAck = (event: string, payload: RpcRequest, meta: RpcRequestMeta) => Promise<any>;

const createSocketStub = (impl: EmitWithAck, id = "sock-rc") => {
    const emissions: Array<{ event: string; payload: RpcRequest; meta?: RpcRequestMeta }> = [];
    const socket = {
        id,
        on: (_event: string, _handler: (...args: any[]) => void) => {
            /* no-op */
        },
        emit: (event: string, payload: RpcRequest, meta?: RpcRequestMeta) => {
            emissions.push({ event, payload, meta });
        },
        timeout: (_ms: number) => ({
            emitWithAck: (event: string, payload: RpcRequest, meta: RpcRequestMeta) => impl(event, payload, meta),
        }),
    } as any;

    return { socket, emissions };
};

describe("RemoteClient", () => {
    test("emits fire-and-forget requests", () => {
        const stub = createSocketStub(async () => ({ result: null }));
        const client = new RemoteClient<Record<string, unknown>>(stub.socket);
        const req: RpcRequest = { method: ".noop", params: [] };

        const returned = client.handleRequest(req, { returnMode: "emit" });
        expect(returned).toBe(req);
        expect(stub.emissions).toEqual([{ event: "rpc", payload: req, meta: { returnMode: "emit" } }]);
    });

    test("returns result from call mode when ack succeeds", async () => {
        const stub = createSocketStub(async (_event, payload, meta) => {
            expect(meta.returnMode).toBe("call");
            return { result: payload.params[0] };
        });
        const client = new RemoteClient<Record<string, unknown>>(stub.socket);
        const req: RpcRequest<string, [number]> = { method: ".add", params: [42] };

        const result = await client.handleRequest(req, { returnMode: "call", timeoutMs: 25 });
        expect(result).toBe(42);
    });

    test("falls back to default result when ack times out", async () => {
        const stub = createSocketStub(async () => {
            throw new Error("timeout");
        });
        const client = new RemoteClient<Record<string, unknown>>(stub.socket);
        const req: RpcRequest = { method: ".slow", params: [] };

        const result = await client.handleRequest(req, {
            returnMode: "call",
            timeoutMs: 10,
            defaultResult: "fallback",
        });
        expect(result).toBe("fallback");
    });

    test("uses default result on error responses", async () => {
        const stub = createSocketStub(async () => ({ error: { code: 0, message: "nope" } }));
        const client = new RemoteClient<Record<string, unknown>>(stub.socket);
        const req: RpcRequest = { method: ".broken", params: [] };

        const result = await client.handleRequest(req, {
            returnMode: "call",
            timeoutMs: 10,
            defaultResult: "default",
        });
        expect(result).toBe("default");
    });
});
