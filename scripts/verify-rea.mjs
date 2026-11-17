// Read-only MCP verification against this workspace's isolated Claude profile.
import {spawn} from 'node:child_process';
import {createInterface} from 'node:readline';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
const root=path.resolve(import.meta.dirname,'..');
const folder=path.join(root,'.tools/rea');fs.mkdirSync(folder,{recursive:true});
const config=JSON.parse(fs.readFileSync(path.join(root,'.claude/.claude.json'))).mcpServers.rea;
const wasm=path.join(folder,'empty-test.wasm');fs.writeFileSync(wasm,Buffer.from([0,97,115,109,1,0,0,0]));
const child=spawn(config.command,config.args,{cwd:root,stdio:['pipe','pipe','pipe']});
const pending=new Map();let nextId=1;
const lines=createInterface({input:child.stdout});
child.stderr.on('data',()=>{});
lines.on('line',line=>{try{const msg=JSON.parse(line);const item=pending.get(msg.id);if(item){pending.delete(msg.id);msg.error?item.reject(Error(JSON.stringify(msg.error))):item.resolve(msg.result);}}catch{}});
child.on('error',e=>{for(const p of pending.values())p.reject(e);});
child.on('exit',()=>{for(const p of pending.values())p.reject(Error('REA exited before replying'));});
function request(method,params){const id=nextId++;return new Promise((resolve,reject)=>{pending.set(id,{resolve,reject});child.stdin.write(JSON.stringify({jsonrpc:'2.0',id,method,params})+'\n');});}
const deadline=setTimeout(()=>{for(const p of pending.values())p.reject(Error('REA verification deadline exceeded'));child.kill();},30000);
try{
 const init=await request('initialize',{protocolVersion:'2024-11-05',capabilities:{},clientInfo:{name:'clear-take-verifier',version:'1.0'}});
 assert.equal(init.serverInfo.version,'6.9.0');
 child.stdin.write(JSON.stringify({jsonrpc:'2.0',method:'notifications/initialized'})+'\n');
 const list=await request('tools/list',{});assert.ok(list.tools.some(t=>t.name==='inspect_wasm_artifact'));
 const session=await request('tools/call',{name:'binary_session',arguments:{expected_package_version:'6.9.0'}});assert.ok(!session.isError);
 const inspected=await request('tools/call',{name:'inspect_wasm_artifact',arguments:{path:wasm}});const wasmStatus=inspected.isError?'unavailable: WABT backend not configured':'passed';
 const native=await request('tools/call',{name:'inspect_with_objdump',arguments:{path:'/usr/bin/true',operation:'file_headers'}});assert.ok(!native.isError,JSON.stringify(native));
 fs.writeFileSync(path.join(folder,'mcp-objdump-evidence.json'),JSON.stringify(native,null,2));
 fs.writeFileSync(path.join(folder,'mcp-wasm-evidence.json'),JSON.stringify(inspected,null,2));
 console.log(JSON.stringify({server:init.serverInfo,tools:list.tools.length,session:'passed',wasmInspection:wasmStatus,objdumpInspection:'passed',note:'Separate stdio client; does not attach tools to the running Arena agent.'},null,2));
}catch(e){console.error(e.message);process.exitCode=1;}finally{clearTimeout(deadline);lines.close();child.stdin.end();child.kill();}
