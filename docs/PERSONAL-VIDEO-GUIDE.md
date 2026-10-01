# Test video analysis with your ChatGPT plan

This personal alpha uses your paired Windows laptop for offline English transcription and your own connected ChatGPT plan for supported visual reasoning. The laptop must stay on. Its OAuth credentials stay on that laptop. No paid inference fallback is enabled.

## Upload from your phone or laptop

1. Open https://scroll.companynerve.com/app and sign in with your Google account. Your default workspace opens automatically.
2. Choose **Upload or import**, then choose a video file. MP4 and WebM uploads are bounded to 250 MB and ten minutes. Use media you are permitted to process.
3. Leave automatic analysis selected. Choose your online computer and a model actually listed by your connected ChatGPT account. Read and check the permission to use your plan allowance and reserve up to ten app compute credits for isolated media preparation.
4. Upload. The app prepares audio and sampled frames in an isolated cloud sandbox, transcribes normalized audio locally, then sends the transcript and sampled frames through your local ChatGPT connection. You do not need to type a transcript.
5. Watch the progress in the source. Review the saved summary, main points, categories, automatic transcript, and timestamped private frame evidence. Sampled frames do not guarantee that every scene or caption was captured.

Your ChatGPT allowance is separate from VibeScroller's media compute allowance. This permission does not authorize coding or a pull request. Those require a separate reviewed plan and bounded execution approval.

## Keep the existing laptop connection running

The owner's private configuration is at `private/personal-runner-production.json`. From the repository folder, run:

```powershell
pnpm runner:personal C:/Code/VibeScroller/vibe-scroller/private/personal-runner-production.json
```

Keep one runner process active. The configuration includes the local Python environment and pinned offline Whisper model. Do not share that file, copy credentials into the website, or commit private files. If your ChatGPT connection needs renewal, use the local connection command and review its official browser consent:

```powershell
pnpm chatgpt:local connect
```

The app lists only models returned by the connected account. It does not promise a model based on its name in another application. Only the verified operator is enabled for this personal alpha; this test is not proof of general commercial availability.

## Import Instagram Saved links

The JSON or HTML ZIP import extracts Saved links and their relevant metadata in your browser. The whole archive is not uploaded. Saved exports usually contain links rather than playable saved videos. Importing links does not itself provide audio or images for analysis.

Open an imported source and attach a permitted video file to analyze it. Automatic retrieval of Instagram Saved media is not implemented. Do not supply Instagram passwords or session cookies as a workaround.

## If analysis stops

- **Computer offline:** start the paired laptop runner, then review the analysis permission again if it expired.
- **Sign in again:** complete the website's fresh sign-in before approving sensitive operations.
- **Allowance unavailable:** check Usage. The app will not switch to a paid provider.
- **Media preparation failed:** review the displayed error. Unknown compute usage remains reserved until reconciliation; repeated requests do not bypass this boundary.
- **Cancel or delete:** cancel processing from the source, or delete it from your library. Deletion fences delayed results and queues associated private assets for removal.

Raw source media is scheduled for expiry after processing; the selected evidence and derived insights follow the documented retention policy. Evidence requires workspace access and is not public. Browser and physical-phone testing are recorded separately in the implementation status.
