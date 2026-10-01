export function preparePersonalInput(
  media: any,
  options: {
    signal?: AbortSignal;
    asr?: any;
    onStage?: (stage: string) => Promise<any>;
    fetchImpl?: any;
    transcribe?: any;
  },
): Promise<{ transcript: any[]; frames: any[]; frameEvidence: any[] }>;
