import { chromium } from 'playwright';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const base=process.env.APP_URL||'https://puppet-house-oregon.onrender.com';
const out=process.env.DEMO_OUTPUT_DIR || '/home/user/puppet-house-demo';
await mkdir(out+'/raw',{recursive:true}); await mkdir(out+'/screens',{recursive:true});
const browser=await chromium.launch({headless:true});
const contexts=[]; const tracks=new Map(); const scenes=[]; const errors=[]; const sampleLines=[];
async function page(){const c=await browser.newContext({viewport:{width:1280,height:800},recordVideo:{dir:out+'/raw',size:{width:1280,height:800}},acceptDownloads:true});contexts.push(c);const start=Date.now();const p=await c.newPage();tracks.set(p,{start,video:p.video()});p.on('pageerror',e=>errors.push(e.message));p.setDefaultTimeout(45000);return p;}
async function shot(name,p,fn){const start=(Date.now()-tracks.get(p).start)/1000;await fn();await p.waitForTimeout(1800);await p.screenshot({path:out+'/screens/'+name+'.png'});scenes.push({name,source:p,start,end:(Date.now()-tracks.get(p).start)/1000});}
async function post(action,payload={}){const r=await fetch(base+'/api/game',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,...payload})});const d=await r.json();assert(r.ok,action+': '+JSON.stringify(d));return d;}
const host=await page(); let guest,spectator;let gameId,hostId,guestId,roomCode;let current;
try{
 await host.goto(base);await host.getByRole('button',{name:'Play solo'}).waitFor();
 await shot('01-intro',host,async()=>{await host.waitForTimeout(2500);await host.mouse.move(370,410,{steps:15});await host.waitForTimeout(1800);});
 await host.getByRole('button',{name:'Create party room',exact:true}).click();
 await shot('02-casting',host,async()=>{await host.locator('input').first().fill('Maya');await host.locator('input').nth(1).fill('I make friends. Then I make moves.');await host.locator('textarea').fill('I secretly coached last season’s winner.');await host.getByRole('button',{name:'The strategist',exact:false}).click();await host.waitForTimeout(2500);await host.locator('.mini-mission').scrollIntoViewIfNeeded();await host.waitForTimeout(1800);});
 await host.getByRole('button',{name:'Create party room',exact:true}).click();await host.waitForSelector('.party-code-card');
 roomCode=(await host.locator('.party-code-card strong').innerText()).trim();
 gameId=await host.evaluate(()=>localStorage.getItem('puppet-house-game'));hostId=await host.evaluate(()=>localStorage.getItem('puppet-house-producer'));
 guest=await page();await guest.goto(base+'/?party='+roomCode);await guest.locator('input').first().fill('Kabir');await guest.getByRole('button',{name:'The charmer',exact:false}).click();
 await shot('03-party',host,async()=>{await host.waitForTimeout(1500);await guest.getByRole('button',{name:'Join the party',exact:true}).click();await guest.waitForSelector('.waiting-host');await host.waitForFunction(()=>document.querySelectorAll('.party-slot.filled').length===2);await host.waitForTimeout(2500);});
 guestId=await guest.evaluate(()=>localStorage.getItem('puppet-house-producer'));
 await host.getByRole('button',{name:'Start the party season'}).click();await host.waitForSelector('.game-page');await host.getByTitle('Pause season').click();
 if(process.env.REQUIRE_LIVE_INTEGRATIONS==='1'){await host.getByText('NEXCONN LIVE',{exact:true}).waitFor();await guest.getByText('NEXCONN LIVE',{exact:true}).waitFor();}
 await shot('04-whispers',host,async()=>{await host.locator('.whisper-section textarea').fill('Build trust with Riya. Keep our alliance quiet until the vote.');await host.waitForTimeout(1200);await host.getByRole('button',{name:'Send whisper'}).click();await host.waitForTimeout(1000);for(let i=0;i<2;i++){await host.getByRole('button',{name:'Next moment'}).click();await host.waitForFunction(()=>!document.querySelector('button[title="How to play"]')?.disabled);await host.waitForTimeout(2000);} });
 spectator=await page();await spectator.goto(base+'/spectate/'+roomCode);await spectator.getByPlaceholder('e.g. DramaWatcher').fill('DramaClub');await spectator.getByRole('button',{name:'Enter the audience'}).click();await spectator.getByText('AUDIENCE CONTROL',{exact:true}).waitFor();
 await shot('05-audience',spectator,async()=>{await spectator.getByPlaceholder('React to the chaos…').fill('Maya is making moves. Who do we trust?');await spectator.locator('.spectator-chat-input button').click();await spectator.getByRole('button',{name:/Memory leak/i}).click();await spectator.waitForTimeout(2200);});
 const view=async producerId=>(await (await fetch(`${base}/api/game?id=${gameId}&producerId=${producerId}`)).json()).game;
 current=await view(hostId);
 while(current.phase==='live')current=(await post('tick',{gameId,producerId:hostId})).game;
 await spectator.waitForSelector('.house-pulse');
 await shot('06-pulse',spectator,async()=>{await spectator.locator('.pulse-options button').last().click();await spectator.waitForSelector('.pulse-options button.selected');await spectator.waitForTimeout(4000);});
 await host.waitForSelector('.vote-card');
 await shot('06b-ballot',host,async()=>{await host.waitForTimeout(2500);});
 async function ballots(){for(const producerId of [hostId,guestId]){const own=await view(producerId);const self=own.contestants.find(p=>p.isPlayer);if(self.eliminated)continue;const target=own.contestants.find(p=>!p.eliminated&&p.id!==self.id&&(own.round===3||!p.immunity));assert(target,'legal target');await post('vote',{gameId,producerId,targetId:target.id});}return (await post('reveal',{gameId,producerId:hostId})).game;}
 current=await ballots();
 for(let safety=0;safety<6&&current.phase!=='results';safety++){while(current.phase==='live'){const before=current.messages.length;current=(await post('tick',{gameId,producerId:hostId})).game;sampleLines.push(...current.messages.slice(before).filter(m=>m.channel==='house'&&m.kind==='chat').map(m=>m.text));}if(current.phase==='vote')current=await ballots();}
 assert.equal(current.phase,'results');await host.waitForSelector('.storyline-section');await guest.waitForSelector('.storyline-section');
 await shot('07-finale',host,async()=>{await host.evaluate(()=>window.scrollTo({top:0,behavior:'instant'}));await host.waitForTimeout(2200);await host.locator('.storyline-section').scrollIntoViewIfNeeded();await host.waitForTimeout(2500);await host.getByRole('button',{name:'Download finale card'}).scrollIntoViewIfNeeded();const d=host.waitForEvent('download');await host.getByRole('button',{name:'Download finale card'}).click();await(await d).saveAs(out+'/Puppet_House_Finale_Card.png');await host.waitForTimeout(1500);});
 await shot('08-rematch',host,async()=>{await host.getByRole('button',{name:'Run it back — same party'}).click();await host.waitForSelector('.party-lobby');await guest.waitForSelector('.party-lobby');assert.equal(await host.evaluate(()=>localStorage.getItem('puppet-house-game')),await guest.evaluate(()=>localStorage.getItem('puppet-house-game')));await host.waitForTimeout(2500);});
 const data=await readFile('src/game/data.ts','utf8');const chunk=data.split('export const DIALOGUE')[1].split('export const AUDIENCE_LINES')[0];const patterns=[...chunk.matchAll(/^\s*"(.*)",?$/gm)].map(m=>new RegExp('^'+m[1].replace(/[.*+?^${}()|[\]\\]/g,'\\$&').replace('\\{target\\}','.+')+'$'));
 const providerHealth=await(await fetch(base+'/api/health')).json();
 if(process.env.REQUIRE_LIVE_INTEGRATIONS==='1')assert(providerHealth.aiDialogue?.lastSuccessAt,'real AI provider success required');
 const novel=sampleLines.filter(l=>!patterns.some(p=>p.test(l))&&!l.startsWith('I have been thinking about my next move.'));
 await writeFile(out+'/session-evidence.json',JSON.stringify({url:base,roomCode,consoleErrors:errors,providerHealth,publicDialogueSamples:sampleLines,nonDirectorDialogueSamples:novel,rematchMigration:true},null,2));
}finally{
 for(const c of contexts)await c.close();
 for(const s of scenes){s.file=await tracks.get(s.source).video.path();delete s.source;}
 await writeFile(out+'/scenes.json',JSON.stringify(scenes,null,2));await browser.close();
}
console.log(JSON.stringify({result:'PASS',roomCode,scenes:scenes.length,consoleErrors:errors},null,2));
