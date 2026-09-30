export const issuer: string;
export const resource: string;
export const planScope: string;
export const appName: string;
export function transaction(
  hostId: string,
  redirectUri: string,
  profile?: { clientId: string; idToken?: string },
): {
  state: string;
  nonce: string;
  verifier: string;
  redirectUri: string;
  clientId?: string;
  url: string;
};
export function callback(
  pending: ReturnType<typeof transaction>,
  url: URL,
): { code: string; clientId: string };
export function tokenRecord(
  data: any,
  identity: any,
  prior?: any,
  nonce?: string,
  now?: number,
): any;
export function inferenceRequest(
  model: string,
  input: string,
  instructions?: string,
): object;
export function completedResponse(
  response: Response,
): Promise<{ text: string; responseId?: string; usage?: unknown }>;
