import {test} from 'node:test';
import assert from 'node:assert/strict';
import {signupSchema,userSchema,loginSchema} from '../src/utils/validation.js';
const data={companyName:'Empresa QA',name:'Persona QA',email:'qa@example.test'};
test('contraseñas nuevas evitan truncamiento de bcrypt por longitud UTF-8',()=>{
 for(const password of ['a'.repeat(73),'á'.repeat(37)])assert.equal(signupSchema.safeParse({...data,password}).success,false);
 for(const password of ['a'.repeat(72),'á'.repeat(36),'contraseña-segura-2026'])assert.equal(signupSchema.safeParse({...data,password}).success,true);
});
test('la creación de colaboradores aplica el mismo límite',()=>{
 const {companyName,...user}=data;assert.equal(userSchema.safeParse({...user,password:'🌳'.repeat(19)}).success,false);
});
test('el login limita entradas desmesuradas y mantiene compatibilidad de cuentas existentes',()=>{
 assert.equal(loginSchema.safeParse({email:data.email,password:'a'.repeat(100)}).success,true);
 assert.equal(loginSchema.safeParse({email:data.email,password:'a'.repeat(101)}).success,false);
});
