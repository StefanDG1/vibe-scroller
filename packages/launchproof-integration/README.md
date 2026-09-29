# LaunchProof summary adapter 0.1.1

`server.ts` and `contract.ts` are the two released, unchanged runtime modules for the optional `launchproof-summary-v1` integration. No LaunchProof application source, private documentation, customer records, or credentials are included.

| File        | SHA-256 of released bytes                                        |
| ----------- | ---------------------------------------------------------------- |
| contract.ts | 0677bee94275df09771022dce80a3d29570b0b263325624a20399e7b4a8ceb7d |
| server.ts   | 6f8cb1608a45bf38afc8bbc4241bc4181eda99b89efb643c62800db5d7ed87bb |

Integration `0.1.1` accepts exactly runner `0.1.0` or `0.1.1`. The check adapter remains `companynerve-v1` version `0.1.0`; unknown versions are rejected. The `server.ts` bytes are unchanged from integration `0.1.0`.

The Next.js wrapper at `apps/starter/lib/launchproof.ts` imports `server-only`. Import the contract as a type in views. Do not import the runtime modules into a client component or accept configuration, roles, or credentials from browser input.

Follow [connection setup](../../docs/operations/launchproof.md) and the [contract and limits](../../docs/launchproof-contract.md). This directory is source-only and adds no package dependencies or install scripts. Upgrade the two files together after reviewing their contract and authorization behavior.
