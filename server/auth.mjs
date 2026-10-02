import { argon2, randomBytes, createHash, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
const derive=promisify(argon2);
export const digestToken=token=>createHash('sha256').update(token).digest('hex');
export const newToken=()=>randomBytes(32).toString('base64url');
export function normalizeEmail(email) {if(typeof email!=='string'||email.length>254||! /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw new Error('Invalid email');return email.toLowerCase();}
export async function hashPassword(password,salt=randomBytes(16)) {if(typeof password!=='string'||password.length<12||Buffer.byteLength(password)>1024)throw new Error('Password must be 12–1024 bytes');const hash=await derive('argon2id',{message:password,nonce:salt,parallelism:1,tagLength:32,memory:65536,passes:3});return `${salt.toString('base64')}:${hash.toString('base64')}`;}
export async function verifyPassword(password,encoded){if(typeof password!=='string'||Buffer.byteLength(password)>1024)return false;const [salt,expected]=encoded.split(':');const hash=await derive('argon2id',{message:password,nonce:Buffer.from(salt,'base64'),parallelism:1,tagLength:32,memory:65536,passes:3});const actual=Buffer.from(expected,'base64');return hash.length===actual.length&&timingSafeEqual(hash,actual);}
