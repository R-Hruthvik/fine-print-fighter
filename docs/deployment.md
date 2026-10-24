# Deploy Fine Print Fighter

Updated: 2026-10-24. This guide prepares a Next.js Node or Vercel deployment. It does not record a deployment or a successful live-provider test.

Fine Print Fighter needs a server for its POST analysis routes. Use a Node.js host or Vercel's Next.js integration; a static export cannot run the analysis API. This matches the installed Next.js 16.4.2 guides in `node_modules/next/dist/docs/01-app/01-getting-started/17-deploying.md` and `01-app/02-guides/self-hosting.md`. See the public [Next.js deployment guide](https://nextjs.org/docs/app/getting-started/deploying).

## Prepare the application

Use Node.js 22 and the committed npm lockfile. From the repository root:

```bash
npm ci
npm run verify
```

Verification runs lint, TypeScript checks, fixture-based tests, and a production build. Those checks do not need model credentials and do not establish live-provider accuracy, account availability, or latency. Keep the deployment on the same verified source revision.

## Configure server environment variables

Set these through your host's secret/environment settings. For a local production smoke test, you can use an ignored `.env.local` file based on [the example](../.env.local.example), including a test Upstash store and an explicit low daily cap. Do not commit real values, include them in screenshots, or prefix keys with `NEXT_PUBLIC_`: public-prefixed values are included in browser bundles. Server environment variables can be supplied at runtime. [Next.js environment guidance](https://nextjs.org/docs/app/guides/self-hosting#environment-variables)

| Variable | Deployment value |
| --- | --- |
| `NEBIUS_API_KEY` | Required secret: an authorized Token Factory key with inference access and sufficient budget |
| `NEBIUS_BASE_URL` | `https://api.tokenfactory.nebius.com/v1`, unless you intentionally use another compatible authorized endpoint |
| `NEMOTRON_MODEL` | A model available to your account; the default is `nvidia/Nemotron-3_5-Lightning` |
| `TAVILY_API_KEY` | Optional secret when keyless research is enabled; recommended for predictable account quotas during judging |
| `ENABLE_STAGE_ROUTES` | Leave unset; individual stage routes are development interfaces and remain unavailable in production |
| `UPSTASH_REDIS_REST_URL` | Required for production: HTTPS endpoint of a shared, single-region Upstash Redis database with EVAL support |
| `UPSTASH_REDIS_REST_TOKEN` | Required secret for the Upstash database |
| `RATE_LIMIT_HASH_SECRET` | Required secret of at least 32 characters; HMACs the trusted client IP before it becomes a Redis key |
| `MAX_PUBLIC_ANALYSES_PER_DAY` | Required integer from 1 to 10,000; global rolling 24-hour analysis cap across all clients. Set separate lower Preview and approved Production values |
| `TRUSTED_CLIENT_IP_HEADER` | Optional; defaults to Vercel's `x-vercel-forwarded-for`. For another host, set only a header the trusted reverse proxy overwrites with the actual client IP |

Omitting `TAVILY_API_KEY` selects Tavily Search through `X-Tavily-Access-Mode: keyless`. This is limited exploration access, not a capacity guarantee. A keyless rate limit or research failure must remain visible as incomplete evidence; it must not become a fabricated successful search. The app still needs an authorized Nebius key for live analysis. [Tavily keyless documentation](https://docs.tavily.com/documentation/keyless), [Nebius onboarding](https://docs.tokenfactory.nebius.com/quickstart)

## Deploy on a Node.js host

1. Choose a host that supports Node.js 22, outbound HTTPS to Nebius/Tavily, and requests lasting at least 120 seconds.
2. Set the server variables above in the host's environment settings. Keep `NODE_ENV` set to `production` for the deployed process.
3. Install with `npm ci` and build with `npm run build`.
4. Start with the existing production script:

   ```bash
   npm run start
   ```

5. Configure the host's port routing and HTTPS domain. Next.js uses `PORT` if your host supplies it; otherwise its usual port is 3000. Set the host's start command to the command above, rather than `next dev`.
6. Set reverse-proxy/load-balancer request and idle timeouts above the 120-second application deadline, allowing time to deliver the response. Verify the actual deployed route; the application cannot extend an upstream timeout.

`next build` followed by `next start` supports the app's server features without a custom server or a static-export configuration. [Next.js Node deployment](https://nextjs.org/docs/app/getting-started/deploying#nodejs-server)

## Deploy on Vercel

1. Import the repository into an authorized Vercel project and use the Next.js framework preset. Use this app's directory as the project root if importing a larger repository.
2. Select Node.js 22 and retain `npm run build` as the build command. This app does not need a custom output directory.
3. Add the server variables to the **Production** environment. Add Preview variables separately only if you intend to test a preview. Mark API keys as secrets.
4. Deploy the verified revision to Production. Environment-variable changes apply to new deployments, so redeploy after configuring or rotating a key. [Vercel environment variables](https://vercel.com/docs/environment-variables)
5. Confirm the deployed analysis function honors `export const maxDuration = 120` from [the analysis route](../src/app/api/extract/route.ts). Vercel's current Fluid Compute documentation lists a 300-second maximum on Hobby, which accommodates this setting; verify the actual project runtime/settings. The app's own deadline remains 120 seconds. [Vercel function duration](https://vercel.com/docs/functions/configuring-functions/duration)
6. Use the public production domain for judge access. Test it in a signed-out/private browser. A generated deployment or preview URL can be protected even when the production domain is public. Check Deployment Protection settings rather than assuming a link is accessible. [Vercel deployment protection](https://vercel.com/docs/deployment-protection)

## Check the deployed workflow

Test through the public URL, using fictional documents:

- Open the intake while signed out. Confirm the layout, labels, and fictional example work.
- Run a real case with a company response. Confirm extraction, research, model-selected tool activity, and source-linked results complete.
- Add the requested evidence and recheck. Confirm the added document is shown separately and is not treated as proof of entitlement.
- Edit the letter, download it, and print/save PDF. Confirm both exports contain the current text and its sources.
- Cancel a running request and retry. Confirm errors preserve the entered documents and do not expose raw provider messages or secrets.
- Confirm the model name, durations, and research limitations reflect the real run. Record the source revision and provider configuration used, without key values.

A rendered page or fixture playback is useful for UI review but does not prove live inference works. A real run needs provider access and may consume credits. Check the selected model's JSON/tool-call behavior and research quota before recording the submission video.

## Request budgets and availability

Production analysis checks a shared Upstash store before any model or research call. One atomic Redis script enforces at most twelve starts per trusted client IP per minute and `MAX_PUBLIC_ANALYSES_PER_DAY` over the exact preceding 24 hours across all instances. Production and Preview use separate Redis key namespaces; configure their daily caps independently. The global cap is mandatory; production requests fail closed if shared budget configuration is missing or unavailable. A process-local limit of three concurrent analyses also protects each running instance. Development uses the existing process-local per-minute budget.

Choose `MAX_PUBLIC_ANALYSES_PER_DAY` only after checking the account's model and research pricing and estimating a conservative maximum cost per analysis from a live representative run. Set the cap to `floor(approved daily spend / conservative maximum cost per analysis)`, then reserve headroom for retries and failed requests. This counter caps analysis starts, not dollars; it cannot guarantee a spend amount while per-run usage is unmeasured. The current project has no verified per-run cost or live-provider latency, so do not enable public analysis until the account owner sets and accepts a numeric cap.

Use Vercel's documented `x-vercel-forwarded-for` header by default. Do not trust an arbitrary client-supplied `X-Forwarded-For`; on a self-hosted Node deployment, configure `TRUSTED_CLIENT_IP_HEADER` only if the front proxy overwrites it from the network peer and the app origin cannot be reached directly. The app hashes this address with `RATE_LIMIT_HASH_SECRET` before storing the per-IP limit and never logs the raw address. Keep Upstash analytics disabled for this limiter. To rotate a provider or Upstash token, create its replacement, update the matching Production and Preview environment values, redeploy those environments, verify the new credential, then revoke the old one. Rotate the Upstash token without deleting the database or changing the stable key namespace. Rotating `RATE_LIMIT_HASH_SECRET` changes per-IP identifiers and resets those short-window counters; do not rotate it during a demo. Keep the global rolling cap data intact when rotating credentials. A 429 response includes the applicable `Retry-After`; a research quota failure is shown as an evidence limitation. The 120-second execution limit does not guarantee successful completion within that time.

## Give judges working access

The official FAQ permits the frontend and unrelated processing to run outside Nebius when the required NVIDIA-model call runs through Token Factory. You do not need to migrate the whole app to Nebius AI Cloud. [Official hackathon FAQ](https://nebiusglobalaihackathon.devpost.com/details/faqs)

Submit a working demo/test-build URL and a public source repository with license and setup instructions. If the app is private, include working judge credentials in the testing instructions. Keep judge access free and available through the judging period, which ends December 15, 2026. Configure provider access on the server so judges can use the app without supplying their own API keys. [Official rules](https://nebiusglobalaihackathon.devpost.com/rules)

Also prepare a public YouTube demonstration under three minutes and English submission materials. Show the actual app, name Nebius and the NVIDIA model aloud, and distinguish live operation from any labeled playback. Use [the demo storyboard](demo/rebuttal-lab-storyboard.md) for preparation; it is not evidence that a recording or deployment exists. [Official submission advice](https://nebiusglobalaihackathon.devpost.com/updates/46205-how-to-build-a-winning-project)
