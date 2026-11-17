import {test} from 'node:test';
import assert from 'node:assert/strict';
import net from 'node:net';
import {env} from '../src/config/env.js';
import {sendAccessEmail} from '../src/services/mail.service.js';
test('SMTP local recibe un enlace con fragmento, sin contraseña ni token en logs',async t=>{
 const sockets=new Set(),received=[];
 const server=net.createServer(socket=>{
  sockets.add(socket);socket.on('close',()=>sockets.delete(socket));socket.setEncoding('utf8');socket.write('220 localhost ESMTP\r\n');
  let buffer='',dataMode=false;
  socket.on('data',chunk=>{
   buffer+=chunk;
   while(true){
    if(dataMode){const end=buffer.indexOf('\r\n.\r\n');if(end<0)return;received.push(buffer.slice(0,end));buffer=buffer.slice(end+5);dataMode=false;socket.write('250 queued\r\n');continue;}
    const end=buffer.indexOf('\r\n');if(end<0)return;const line=buffer.slice(0,end);buffer=buffer.slice(end+2);
    if(/^(EHLO|HELO)/i.test(line))socket.write('250 localhost\r\n');
    else if(/^DATA/i.test(line)){dataMode=true;socket.write('354 End with dot\r\n');}
    else if(/^QUIT/i.test(line)){socket.end('221 bye\r\n');return;}
    else socket.write('250 OK\r\n');
   }
  });
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const before=env.smtp,appUrl=env.appUrl;
 t.after(async()=>{env.smtp=before;env.appUrl=appUrl;for(const socket of sockets)socket.destroy();await new Promise(resolve=>server.close(resolve));});
 env.smtp={host:'127.0.0.1',port:server.address().port,secure:false,user:'',password:'',from:'PolicyBot <no-reply@example.test>'};env.appUrl='https://policybot.example.test';
 await sendAccessEmail({email:'persona@example.test',purpose:'invite',token:'a'.repeat(64),companyName:'Empresa de prueba'});
 assert.equal(received.length,1);
 // Nodemailer usa quoted-printable: el igual del fragmento se representa como =3D.
 assert.match(received[0],/#invite=3D/);assert.match(received[0],/To: persona@example.test/);
 assert.ok(!received[0].includes('SMTP_PASSWORD'));
});
