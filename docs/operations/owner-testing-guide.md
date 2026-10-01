# Your VibeScroller testing guide

Mode: how-to. Last checked October 1, 2026. This guide distinguishes working checks from work still underway. It is not a production-ready announcement.

## Start here

The real address is https://scroll.companynerve.com/app on your laptop or phone. HTTPS, clean production Google sign-in and automatic default workspace entry work. Google remains restricted to the configured test user. Existing active workspaces are reused; switching is available from Account. The dark interface and automatic laptop-assisted audio/visual analysis passed production verification on October 1. Reload an old tab to load the latest interface.

Production hosting now uses the owner�s Vercel Pro team. Reload the page after the host change; your same-domain login remains usable.

Use the real domain for the personal test. Earlier Cloudflare staging capacity failures remain documented; staging and local builds do not define the current production result.

Use your existing VibeScroller Google identity. Signing into VibeScroller, Instagram and ChatGPT are separate actions. Never paste passwords, cookies or OAuth tokens into the app.

## Import your Instagram Saved list

1. Open the library and choose **Add source**.
2. Choose **Instagram export or link import**.
3. Select your ZIP export, or the extracted `saved_posts.json`. JSON is preferred; a Saved HTML file also works. The archive stays on the selecting device.
4. Review the counts and the listed links. Confirm that you may submit the content, then choose **Import reviewed links**. For a larger export, submit subsequent batches when the button permits it.
5. Read the import manifest. A waiting record means a link was saved but needs permitted media or a transcript before analysis. A quota refusal does not mean the source was saved.

Your supplied August archive produced four distinct links, three Reels and one post of unverified media type. That is what its Saved metadata contains, not a claim about all your current saves. The import saved all four in production and charged zero analysis credits, without uploading the ZIP, messages or contacts.

For a fresh export, use Instagram's Accounts Center information-export controls, select your profile, Saved where offered, all time and JSON. An export usually supplies links and metadata; it does not grant access to other creators' video files. Upload content you may process if a link is private, removed or inaccessible. Do not provide Instagram session cookies.

## Use your ChatGPT plan

Keep the paired laptop awake and connected. From Home choose **Upload or import**, then **Permitted media upload**. Select a video you may process, leave automatic analysis selected, choose the online computer/model, and review both source permission and plan/compute authorization. Choose **Upload and analyze**. No transcript is needed. If the app requests **Sign in again**, follow its link before selecting the file again. The authorization requires a fresh website sign-in.

Production automatic upload passed at its first processing generation. The isolated worker prepared audio and sampled frames, offline Whisper supplied the English transcript, and your ChatGPT plan saved three cited insights. The explicitly owned synthetic video included visual-only size/spacing markers, correctly read by the model. Watch preparation, transcription and analysis, then review Main points, **Full summary and analysis notes**, the original transcript and private timestamped video evidence.

MP4/WebM input is bounded to 250 MB and ten minutes. Local transcription currently supports English. Whisper uses laptop resources rather than your ChatGPT allowance; isolated media preparation separately reserves up to ten app compute credits. Raw video passes the isolated decoder before normalized audio reaches the local utility.

Your existing local ChatGPT consent passed. A real text request and a real synthetic-image request succeeded without an API key or alternate funding. The image test used GPT-5.6 Sol with medium reasoning and reported 47 tokens. The account catalogue does not currently expose GPT-6.1 Sol through this route. The app must offer the models the account actually supports.

The automatic personal route uses the account's advertised GPT-5.6-Sol with medium reasoning during verification. There is no paid inference or alternate-model fallback. See [the complete video guide](../PERSONAL-VIDEO-GUIDE.md), [personal runner setup](personal-analysis-runner.md) and [local ChatGPT setup](chatgpt-local.md). Gemini is a later optional route. Automatic Instagram Saved media retrieval is not implemented: attach a video you may process to an imported link.

## Review and apply a useful idea

After an actual analysis completes, review its summary, main points, source evidence and coverage labels. Sampled frames are not every scene. Supplied captions are not a verified audio transcript. Keep an honest no-fit result when a source has no useful connection to a project.

Connect GitHub and select only the repositories you want reviewed. Inspect the proposed change against its recorded repository commit. Accepting a proposal creates a plan; review and edit it before separately approving coding. That approval binds the plan, repository, executor, funding route and maximum cost. Review the draft PR in GitHub. V1 does not merge or deploy automatically.

The isolated cloud draft-PR route has staging evidence. The Windows local coding route remains blocked by its failed isolation check. ChatGPT consent does not remove that block. Unattended work still requires the specific approved task and budget.

## Storage and evidence

The ZIP is processed locally and is not retained by the app. Private EU R2 stores selected evidence with Convex metadata. Authenticated frame requests returned private/no-store; unauthenticated requests returned no image bytes. Source deletion fences delayed results and queues associated objects for removal. Successfully processed raw media expires after 24 hours, normalized temporary audio after one hour. Selected evidence follows the documented retention policy. Android hardware testing remains deferred; phone-sized Chrome layouts and interactions passed.

Search, tags and state filters already exist. More categories and ranking should help retrieve relevant analyses, references and repository matches. A general conversational library assistant is not currently verified.

## What to report when testing

Record the page, approximate time, device and action that failed. Include the visible error and whether the source was saved. Avoid repeated submissions after an unclear write result. Do not send private tokens or full archives in GitHub issues. Screenshots should omit personal or sensitive content.

The [implementation record](../implementation-status.md) lists exact test evidence. [Deployment instructions](vibescroller-deployment.md) describe environment setup. [The publication checklist](../../legal/POLICY-IMPLEMENTATION.md) and [accountant handover](operator-tax-and-publication.md) remain required for paid release. No professional legal review has been claimed.

## Find the insights and categories

Open Library. Choose Music, Reading or another category, then sort by import date, save date, update date or title. Search finds matching stored sources by relevance. Open a whole source row to read all insights and expand its private evidence. The count on the row shows the full number of insights, even when only three point titles are previewed.

Open Categories inside a source to edit its names. A new valid topic can be created by future analysis. Your manual choices survive reprocessing. The shared suggestion control is optional, publishes no source content and requires operator review before a name joins the app-wide vocabulary.
