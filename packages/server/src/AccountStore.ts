import { Database } from "bun:sqlite";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

export interface Account {
    id: string;
    name: string;
    password_salt: string;
    password_hash: string;
    created_at: number;
}

export default class AccountStore {
    private db: Database;

    constructor(dbPath = "accounts.db") {
        // Ensure directory exists for file DB
        const dir = path.dirname(dbPath);
        if (dir && dir !== "." && !fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        this.db = new Database(dbPath);
        this.init();
    }

    private init() {
        this.db.run(
            `CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name TEXT UNIQUE NOT NULL,
        password_salt TEXT NOT NULL,
        password_hash TEXT NOT NULL,
        created_at INTEGER NOT NULL
      )`
        );

        // Seed a few accounts if empty
        const countStmt = this.db.query("SELECT COUNT(1) as cnt FROM users");
        const row = countStmt.get() as { cnt: number } | undefined;
        const cnt = row?.cnt ?? 0;
        if (cnt === 0) {
            this.seedDefaultUsers();
        }
    }

    private randomId(prefix = "u_") {
        return `${prefix}${Math.random().toString(36).slice(2, 10)}`;
    }

    private hashPassword(password: string, salt: string) {
        // Simple demo hash: sha256(salt + password)
        return crypto.createHash("sha256").update(salt + password).digest("hex");
    }

    private seedDefaultUsers() {
        const users: Array<{ name: string; password: string }> = [
            { name: "alice", password: "alice123" },
            { name: "bob", password: "bob123" },
            { name: "charlie", password: "charlie123" },
        ];
        const insert = this.db.query(
            "INSERT INTO users (id, name, password_salt, password_hash, created_at) VALUES (?, ?, ?, ?, ?)"
        );
        const now = Date.now();
        for (const u of users) {
            const salt = crypto.randomBytes(16).toString("hex");
            const id = this.randomId();
            const hash = this.hashPassword(u.password, salt);
            insert.run(id, u.name, salt, hash, now);
        }
    }

    getUserByName(name: string): Account | undefined {
        const stmt = this.db.query(
            "SELECT id, name, password_salt, password_hash, created_at FROM users WHERE name = ?"
        );
        return (stmt.get(name) as Account | undefined) ?? undefined;
    }

    verifyCredentials(name: string, password: string): Account | undefined {
        const acc = this.getUserByName(name);
        if (!acc) return undefined;
        const hash = this.hashPassword(password, acc.password_salt);
        return hash === acc.password_hash ? acc : undefined;
    }
}
