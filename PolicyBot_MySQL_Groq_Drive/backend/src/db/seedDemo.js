import fs from 'node:fs/promises';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import bcrypt from 'bcryptjs';
import {env,assertConfig} from '../config/env.js';
import {pool,one,run,transaction} from './pool.js';
import {createDocument,indexDocument} from '../services/documents.service.js';
if(env.nodeEnv==='production')throw new Error('Los datos de demostración no se instalan en producción');
assertConfig();
const password=process.env.DEMO_PASSWORD||'DemoSeguro2026!';
if(password.length<10)throw new Error('DEMO_PASSWORD demasiado corta');
const hash=await bcrypt.hash(password,12);
const fixtureDir=path.resolve(env.backendDir,'../database/fixtures');
const companies=[
  {name:'Café Montaña S.A.',email:'admin.cafe@demo.test',colaborador:'equipo.cafe@demo.test',prefix:'cafe'},
  {name:'Logística Pacífico',email:'admin.logistica@demo.test',colaborador:'equipo.logistica@demo.test',prefix:'logistica'}
];
try{
  for(const company of companies){
    let c=await one('SELECT company_id FROM users WHERE email=?',[company.email]);
    if(!c){
      const companyId=randomUUID();
      await transaction(async cx=>{
        await cx.execute('INSERT INTO companies(id,name,plan_id) VALUES (?, ?, ?)',[companyId,company.name,'gratis']);
        for(const [email,role,name] of [[company.email,'admin','Administrador demo'],[company.colaborador,'colaborador','Colaborador demo']]){
          await cx.execute('INSERT INTO users(id,company_id,email,name,password_hash,role) VALUES (?,?,?,?,?,?)',[randomUUID(),companyId,email,name,hash,role]);
        }
      });c={company_id:companyId};
    }
    for(const topic of ['vacaciones','teletrabajo','reembolsos']){
      const name=`${company.prefix}-${topic}.txt`;
      const existing=await one('SELECT id FROM documents WHERE company_id=? AND name=?',[c.company_id,name]);
      if(existing)continue;
      const text=await fs.readFile(path.join(fixtureDir,name),'utf8');
      const id=await createDocument({companyId:c.company_id,name,mime:'text/plain'});
      await indexDocument(c.company_id,id,text);
    }
    console.log('Empresa preparada:',company.name,company.email,company.colaborador);
  }
  console.log('Contraseña de demostración:',password);
  console.log('ATENCIÓN: no uses estos usuarios en producción.');
}finally{await pool.end();}
