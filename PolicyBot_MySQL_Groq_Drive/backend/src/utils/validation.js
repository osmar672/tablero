import {z} from 'zod';
export const signupSchema=z.object({companyName:z.string().trim().min(3).max(150),name:z.string().trim().min(2).max(120),email:z.string().trim().email().max(190).transform(x=>x.toLowerCase()),password:z.string().min(10).max(100)}).strict();
export const loginSchema=z.object({email:z.string().trim().email().transform(x=>x.toLowerCase()),password:z.string().min(1)}).strict();
export const userSchema=z.object({name:z.string().trim().min(2).max(120),email:z.string().trim().email().max(190).transform(x=>x.toLowerCase()),password:z.string().min(10).max(100),role:z.enum(['admin','colaborador']).default('colaborador')}).strict();
export const messageSchema=z.object({question:z.string().trim().min(2).max(2000)}).strict();
export const folderSchema=z.object({folderId:z.union([z.string().regex(/^[A-Za-z0-9_-]{10,120}$/),z.literal('')])}).strict();
export const idSchema=z.string().uuid();
