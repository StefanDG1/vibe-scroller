export class LocalChatGPT {
  constructor(options?: {
    store?: any;
    fetchImpl?: any;
    verify?: (token: string, clientId: string) => Promise<any>;
    openBrowser?: (url: string) => Promise<void>;
  });
  status(): Promise<{
    activeProfileId?: string;
    profiles: {
      id: string;
      label: string;
      email?: string;
      connected: boolean;
      sharing: boolean;
    }[];
    manageUsage: string;
  }>;
  signIn(profileId?: string): Promise<{ profileId: string; sharing: boolean }>;
  select(profileId: string): Promise<void>;
  models(): Promise<{ slug: string; displayName: string }[]>;
  respond(options: {
    model: string;
    input: string;
    instructions?: string;
    frames?: { dataUrl: string; timestampMs: number }[];
    reasoningEffort?: "low" | "medium" | "high";
  }): Promise<{ text: string; responseId?: string; usage?: unknown }>;
  disconnect(): Promise<{ remoteRevoked: boolean; manageUsage?: string }>;
}
export const localApplicationName: string;
