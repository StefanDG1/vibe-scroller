# Your VibeScroller testing guide

Mode: how-to. Last checked October 1, 2026. This guide distinguishes working checks from work still underway. It is not a production-ready announcement.

## Start here

The intended address is https://scroll.companynerve.com/app. Domain, production sign-in and the complete laptop-assisted video journey are still being configured. Do not treat this address as ready until the deployment record confirms it.

The current development address is https://vibescroller-staging.danistefangheorghiu.workers.dev/app. Its earlier capacity failures remain documented. The newest ZIP importer has passed local browser testing but is not yet deployed there. The local production build with that importer runs at http://localhost:3002/app on the laptop.

Use your existing VibeScroller Google identity. Signing into VibeScroller, Instagram and ChatGPT are separate actions. Never paste passwords, cookies or OAuth tokens into the app.

## Import your Instagram Saved list

1. Open the library and choose **Add source**.
2. Choose **Instagram export or link import**.
3. Select your ZIP export, or the extracted `saved_posts.json`. JSON is preferred; a Saved HTML file also works. The archive stays on the selecting device.
4. Review the counts and the listed links. Confirm that you may submit the content, then choose **Import reviewed links**. For a larger export, submit subsequent batches when the button permits it.
5. Read the import manifest. A waiting record means a link was saved but needs permitted media or a transcript before analysis. A quota refusal does not mean the source was saved.

Your supplied August archive produced four distinct links, three Reels and one post of unverified media type. That is what its Saved metadata contains, not a claim about all your current saves. The import saved all four in the development workspace and charged zero analysis credits. It sent 1,103 bytes of normalized metadata, without the ZIP, messages or contacts.

For a fresh export, use Instagram's Accounts Center information-export controls, select your profile, Saved where offered, all time and JSON. An export usually supplies links and metadata; it does not grant access to other creators' video files. Upload content you may process if a link is private, removed or inaccessible. Do not provide Instagram session cookies.

## Use your ChatGPT plan

Keep the paired laptop awake and connected for the planned personal route. Local Whisper will transcribe audio; your eligible ChatGPT model will review text and sampled frames. Whisper uses the laptop's resources rather than your ChatGPT allowance. The browser-connected transcription and analysis journey is still implementation work.

Your existing local ChatGPT consent passed. A real text request and a real synthetic-image request succeeded without an API key or alternate funding. The image test used GPT-5.6 Sol with medium reasoning and reported 47 tokens. The account catalogue does not currently expose GPT-6.1 Sol through this route. The app must offer the models the account actually supports.

Do not approve the existing managed-analysis route as a substitute for this OpenAI-only test. The saved preference alone does not connect browser jobs to the laptop. The desktop text utility is usable separately; see [local ChatGPT setup](chatgpt-local.md). Gemini is a later optional route and must never become an automatic fallback.

## Review and apply a useful idea

After an actual analysis completes, review its summary, main points, source evidence and coverage labels. Sampled frames are not every scene. Supplied captions are not a verified audio transcript. Keep an honest no-fit result when a source has no useful connection to a project.

Connect GitHub and select only the repositories you want reviewed. Inspect the proposed change against its recorded repository commit. Accepting a proposal creates a plan; review and edit it before separately approving coding. That approval binds the plan, repository, executor, funding route and maximum cost. Review the draft PR in GitHub. V1 does not merge or deploy automatically.

The isolated cloud draft-PR route has staging evidence. The Windows local coding route remains blocked by its failed isolation check. ChatGPT consent does not remove that block. Unattended work still requires the specific approved task and budget.

## Storage and evidence

The ZIP is processed locally and is not retained by the app. Save only necessary source metadata and derived analysis. Useful screenshots or crops may be retained as private evidence with source/timestamp links and disclosed limits. The intended cloud split is R2 for images and Convex for metadata. Retained evidence must disappear when its source is deleted. This retention extension still needs integration and deletion checks.

Search, tags and state filters already exist. More categories and ranking should help retrieve relevant analyses, references and repository matches. A general conversational library assistant is not currently verified.

## What to report when testing

Record the page, approximate time, device and action that failed. Include the visible error and whether the source was saved. Avoid repeated submissions after an unclear write result. Do not send private tokens or full archives in GitHub issues. Screenshots should omit personal or sensitive content.

The [implementation record](../implementation-status.md) lists exact test evidence. [Deployment instructions](vibescroller-deployment.md) describe environment setup. [The publication checklist](../../legal/POLICY-IMPLEMENTATION.md) and [accountant handover](operator-tax-and-publication.md) remain required for paid release. No professional legal review has been claimed.
