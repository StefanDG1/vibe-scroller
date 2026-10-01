export function processPersonalJob(
  job: any,
  dependencies: {
    client: {
      respond: (options: any) => Promise<any>;
      status: () => Promise<any>;
    };
    request: (operation: string, args: any) => Promise<any>;
    signal?: AbortSignal;
    asr?: { pythonPath: string; modelDirectory: string };
    prepareInput?: (media: any, options: any) => Promise<any>;
  },
): Promise<{ completed: boolean }>;
