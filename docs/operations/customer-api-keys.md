# Customer API credentials

Mode: how-to. The OpenAI customer-key coding route is implemented and covered by synthetic tests. No funded customer-key staging request has passed. The operator has not supplied or funded an OpenAI API credential.

## Prepare the reviewed registry

Set `OPENAI_CUSTOMER_MODELS_JSON` in Convex to an array of reviewed entries. An empty or malformed registry disables the customer route. No default model, price or account access is inferred. Each entry requires:

| Field                    | Meaning                                                                                              |
| ------------------------ | ---------------------------------------------------------------------------------------------------- |
| id                       | Exact API model identifier, independently checked against the customer account's model-list response |
| version                  | Reviewed configuration version                                                                       |
| inputUsdCentsPerMillion  | Nonnegative integer standard input price in USD cents per million tokens                             |
| outputUsdCentsPerMillion | Nonnegative integer output price in USD cents per million tokens                                     |
| maxInputBytes            | Complete prompt, schema and input byte ceiling, 1,000 to 100,000                                     |
| maxOutputTokens          | Verified supported output ceiling, at least the 4,000-token request limit                            |
| verifiedAt               | Verification timestamp in epoch milliseconds; expires after 30 days                                  |
| structuredOutput         | Must be true after checking the Responses structured-output capability                               |
| dataPolicyUrl            | Reviewed HTTPS provider data-policy reference                                                        |

Review official model, pricing and data-processing documentation before populating this registry. Model discovery establishes account visibility, not funding, structured-output success or zero retention. Browser access was blocked by Chrome's renewed remote-debugging prompt at the implementation checkpoint; no current model record was invented to get past it.

## Connect and approve

The workspace owner signs in again, saves the credential in Connections, then uses Verify credential. This sends a model-list GET request, not an inference request. Saving or testing requires an authentication timestamp no older than five minutes. Public connection queries expose status and reviewed available models, never ciphertext or the credential.

Execution approval selects the customer-key cloud route and a reviewed available model. It displays separate platform credits and a USD provider ceiling. The provider quote conservatively assumes one token per approved input byte plus 2,000 overhead tokens and 4,000 output tokens. The request rechecks its actual input size before dispatch. Prices and the credential revision are bound to approval; configuration changes require a new approval.

The trusted server decrypts the credential and issues one Responses request. It sends no key to a sandbox, generated file, model prompt or publication broker. Requests disable provider response storage without claiming zero provider retention. Revocation, replacement or permission loss stops further requests and aborts the active HTTP wait. A request already issued may have incurred provider cost before cancellation. Its measured receipt is retained without reviving the run. Unknown usage and timeouts require reconciliation and never trigger an automatic request retry or funding fallback.

OpenAI charges the customer's API account. Platform credits cover isolated cloud compute only on this route. A ChatGPT login or subscription does not fund this hosted route. Final patch review and authorized publication remain separate.

## Rotate encryption keys

Provision a new 32-byte key under a new `SECRET_KEY_<version>` and change `SECRET_KEY_VERSION`. Run the internal `credentialRotation:rotate` action. Its bounded pages decrypt in the trusted Node action and replace ciphertext through compare-and-swap, preserving credential revisions and preventing overwriting a concurrently replaced credential. It prints counts only.

Check `credentialRotation:status`, allow in-flight reads of historical ciphertext to finish, then retire the old key only when no old versions remain. The staging-only `scripts/rotate-encryption-key.mjs` provisions version 2 and supports explicit old-key retirement. Never run it against production. Record the migration outcome without key material.
