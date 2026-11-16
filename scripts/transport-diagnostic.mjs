import { chromium } from 'playwright';
const base='https://puppet-house-oregon.onrender.com';
const post=async(action,p={})=>{const r=await fetch(base+'/api/game',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,...p})}); const d=await r.json(); if(!r.ok)throw Error(JSON.stringify(d)); return d;};
const h=await post('createParty',{input:{name:'TransportHost',archetype:'strategist',tagline:'Here for the crown',secret:'Private QA secret',objectiveId:'secret-keeper'}});
const g=await post('joinParty',{code:h.game.roomCode,input:{name:'TransportGuest',archetype:'charmer',tagline:'Friends first',secret:'Private guest secret',objectiveId:'fan-favorite'}});
await post('startParty',{gameId:h.game.id,producerId:h.producerId});
const b=await chromium.launch();
const pages=[];
for(const [role,data] of [['host',h],['guest',g]]){
 const p=await b.newPage(); pages.push(p);
 await p.route('**/*.js',async route=>{const r=await route.fetch();let s=await r.text();s=s.replace(/([a-zA-Z_$][\w$]*)\.NCEngine\.connect\(/g,'(window.__sdk=$1,$1.NCEngine).connect(');await route.fulfill({response:r,body:s});});
 await p.addInitScript(({id,producerId})=>{localStorage.setItem('puppet-house-game',id);localStorage.setItem('puppet-house-producer',producerId);window.__events=[];for(const name of ['puppet-house:nexconn-received','puppet-house:nexconn-delivery'])window.addEventListener(name,e=>window.__events.push({name,detail:e.detail}));},{id:h.game.id,producerId:data.producerId});
 p.on('console',msg=>{if(msg.type()==='warning'||msg.type()==='error')console.log(role,msg.type(),msg.text().slice(0,240));});
 await p.goto(base); await p.getByText('NEXCONN LIVE',{exact:true}).waitFor({timeout:45000});
 if(role==='host')await p.getByTitle('Pause season').click();
 await p.evaluate(()=>{window.__raw=[];window.__sdk.NCEngine.addMessageHandler('diagnostic',new window.__sdk.MessageHandler({onMessageReceived:e=>window.__raw.push(e.messages.map(m=>({channel:m.channelIdentifier,keys:Object.keys(m)})))}));});
}
console.log('before',await pages[0].evaluate(()=>window.__events));
const groupId=`house-${h.game.id}`.replace(/[^a-zA-Z0-9_-]/g,'').slice(0,64);
console.log('members',await pages[0].evaluate(async ({groupId,ids})=>{const r=await new window.__sdk.GroupChannel(groupId).getMembers(ids);return {isOk:r.isOk,code:r.code,data:r.data};},{groupId,ids:[h.producerId,g.producerId]}));
console.log('join',await pages[1].evaluate(async groupId=>{const r=await new window.__sdk.GroupChannel(groupId).join();return {isOk:r.isOk,code:r.code,data:r.data};},groupId));
console.log('group',await pages[0].evaluate(async groupId=>{const s=window.__sdk;const r=await new s.GroupChannel(groupId).sendMessage(new s.SendTextMessageParams({text:'Transport diagnostic message'}));return {isOk:r.isOk,code:r.code,msg:r.msg,keys:Object.keys(r)};},groupId));
console.log('direct',await pages[0].evaluate(async agent=>{const s=window.__sdk;const r=await new s.DirectChannel(agent).sendMessage(new s.SendTextMessageParams({text:'Diagnostic private whisper'}));return {isOk:r.isOk,code:r.code,msg:r.msg};},g.producerId));
await pages[1].waitForTimeout(5000);
for(let i=0;i<2;i++)console.log(i,await pages[i].evaluate(()=>({events:window.__events,raw:window.__raw})));
await b.close();
