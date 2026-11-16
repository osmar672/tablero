import mysql from 'mysql2/promise';
import {env} from '../config/env.js';
export const pool=mysql.createPool({...env.db,waitForConnections:true,connectionLimit:10,timezone:'Z',decimalNumbers:true,enableKeepAlive:true});
export async function one(sql,params=[]){const [rows]=await pool.execute(sql,params);return rows[0]??null;}
export async function many(sql,params=[]){const [rows]=await pool.execute(sql,params);return rows;}
export async function run(sql,params=[]){const [result]=await pool.execute(sql,params);return result;}
export async function transaction(fn){const cx=await pool.getConnection();try{await cx.beginTransaction();const result=await fn(cx);await cx.commit();return result;}catch(e){await cx.rollback();throw e;}finally{cx.release();}}
