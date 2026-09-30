import {readFile,realpath} from "node:fs/promises";
import {resolve,relative,isAbsolute,parse} from "node:path";
import {AppServer} from "./app-server.mjs";
const configPath=process.argv[2];
if(!configPath)throw new Error("Usage: node packages/runner/runner.mjs /absolute/path/to/private-runner-config.json");
const config=JSON.parse(await readFile(configPath,"utf8"));
if(config.protocolVersion!=="1.0.0"||config.codexVersion!=="0.142.3")throw new Error("Regenerate and verify the protocol before changing the pinned Codex version.");
if(!config.isolation?.verifiedEvidence||!config.isolation?.launcher||!config.credentialVaultAdapter)throw new Error("Execution blocked: Windows isolation evidence and an OS credential-vault adapter are required. A worktree does not satisfy isolation.");
if(new URL(config.server).protocol!=="https:")throw new Error("The runner uses outbound HTTPS only.");
for(const mapping of config.repositories){const root=await realpath(mapping.directory);if(root===parse(root).root||root===process.env.USERPROFILE||root.startsWith("\\\\"))throw new Error("Repository root mapping is forbidden.");mapping.directory=root;}
// The verified launcher must apply OS restrictions before starting app-server.
const server=new AppServer(config.isolation.launcher,config.isolation.launcherArgs);
server.onEvent(message=>{if(message.id!==undefined){server.deny(message);return;}if(["item/started","item/completed","turn/completed"].includes(message.method))console.log(JSON.stringify({event:message.method,time:Date.now()}));});
await server.initialize();
const account=await server.account();console.log(JSON.stringify({connected:!!account.account,route:"official_local_codex",tokensExported:false}));
console.log("Runner dispatch remains disabled until pairing, vault retrieval, snapshot and lease integration pass staging checks.");
server.close();
