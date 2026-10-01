import { DatabaseSync } from 'node:sqlite';
import { mkdirSync, chmodSync } from 'node:fs';
import { dirname } from 'node:path';
import { randomUUID } from 'node:crypto';
import { hashPassword,normalizeEmail } from './auth.mjs';
export function createStore(dbPath) {
 if(dbPath!==':memory:')mkdirSync(dirname(dbPath),{recursive:true,mode:0o700});
 process.umask(0o077);const db=new DatabaseSync(dbPath);if(dbPath!==':memory:')chmodSync(dbPath,0o600);
 db.exec(`PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;
 CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY,email TEXT UNIQUE NOT NULL,password_hash TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS sessions(digest TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id),expires_at INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS tenants(id TEXT PRIMARY KEY,name TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS memberships(tenant_id TEXT REFERENCES tenants(id),user_id TEXT REFERENCES users(id),role TEXT CHECK(role IN ('owner','admin','member')),PRIMARY KEY(tenant_id,user_id));
 CREATE TABLE IF NOT EXISTS projects(id TEXT PRIMARY KEY,tenant_id TEXT NOT NULL REFERENCES tenants(id),name TEXT NOT NULL,data TEXT NOT NULL,revision INTEGER NOT NULL,created_at TEXT NOT NULL,updated_at TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS images(id TEXT PRIMARY KEY,project_id TEXT UNIQUE NOT NULL REFERENCES projects(id) ON DELETE CASCADE,tenant_id TEXT NOT NULL REFERENCES tenants(id),mime TEXT NOT NULL,width INTEGER NOT NULL,height INTEGER NOT NULL,bytes BLOB NOT NULL);
 CREATE TABLE IF NOT EXISTS recognitions(id TEXT PRIMARY KEY,project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,tenant_id TEXT NOT NULL REFERENCES tenants(id),status TEXT NOT NULL,draft TEXT NOT NULL,created_at TEXT NOT NULL);`);
 db.exec('CREATE TABLE IF NOT EXISTS recognition_sources(recognition_id TEXT PRIMARY KEY REFERENCES recognitions(id) ON DELETE CASCADE,image_id TEXT,sha256 TEXT NOT NULL,project_revision INTEGER NOT NULL)');
 return {db,async createUser(email,password){const id=randomUUID();const hash=await hashPassword(password);db.prepare('INSERT INTO users VALUES(?,?,?)').run(id,normalizeEmail(email),hash);return {id,email:normalizeEmail(email)};},close(){db.close();}};
}
