import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import { tmpdir } from "node:os";
import AccountStore from "../src/AccountStore";

let tmpDir: string;
let store: AccountStore | undefined;

const createStore = () => {
    store = new AccountStore(path.join(tmpDir, "accounts.db"));
    return store;
};

beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(tmpdir(), "acct-store-"));
});

afterEach(() => {
    store?.close();
    store = undefined;
    fs.rmSync(tmpDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 50 });
});

describe("AccountStore", () => {
    test("seeds default users on first run", () => {
        const store = createStore();
        const alice = store.getUserByName("alice");
        expect(alice?.name).toBe("alice");
        expect(alice?.password_hash).toBeDefined();
        expect(alice?.password_salt).toBeDefined();
    });

    test("verifies correct credentials and rejects bad ones", () => {
        const store = createStore();
        expect(store.verifyCredentials("alice", "alice123")?.id).toBeDefined();
        expect(store.verifyCredentials("alice", "wrong")).toBeUndefined();
        expect(store.verifyCredentials("nobody", "irrelevant")).toBeUndefined();
    });
});
