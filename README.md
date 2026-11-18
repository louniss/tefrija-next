This is a new [**React Native**](https://reactnative.dev) project, bootstrapped using [`@react-native-community/cli`](https://github.com/react-native-community/cli).

# Getting Started

> **Note**: Make sure you have completed the [Set Up Your Environment](https://reactnative.dev/docs/set-up-your-environment) guide before proceeding.

## Step 1: Start Metro

First, you will need to run **Metro**, the JavaScript build tool for React Native.

To start the Metro dev server, run the following command from the root of your React Native project:

```sh
# Using npm
npm start

# OR using Yarn
yarn start
```

## Step 2: Build and run your app

With Metro running, open a new terminal window/pane from the root of your React Native project, and use one of the following commands to build and run your Android or iOS app:

### Android

```sh
# Using npm
npm run android

# OR using Yarn
yarn android
```

### iOS

For iOS, remember to install CocoaPods dependencies (this only needs to be run on first clone or after updating native deps).

The first time you create a new project, run the Ruby bundler to install CocoaPods itself:

```sh
bundle install
```

Then, and every time you update your native dependencies, run:

```sh
bundle exec pod install
```

For more information, please visit [CocoaPods Getting Started guide](https://guides.cocoapods.org/using/getting-started.html).

```sh
# Using npm
npm run ios

# OR using Yarn
yarn ios
```

If everything is set up correctly, you should see your new app running in the Android Emulator, iOS Simulator, or your connected device.

This is one way to run your app — you can also build it directly from Android Studio or Xcode.

## Step 3: Modify your app

Now that you have successfully run the app, let's make changes!

Open `App.tsx` in your text editor of choice and make some changes. When you save, your app will automatically update and reflect these changes — this is powered by [Fast Refresh](https://reactnative.dev/docs/fast-refresh).

When you want to forcefully reload, for example to reset the state of your app, you can perform a full reload:

- **Android**: Press the <kbd>R</kbd> key twice or select **"Reload"** from the **Dev Menu**, accessed via <kbd>Ctrl</kbd> + <kbd>M</kbd> (Windows/Linux) or <kbd>Cmd ⌘</kbd> + <kbd>M</kbd> (macOS).
- **iOS**: Press <kbd>R</kbd> in iOS Simulator.

## Congratulations! :tada:

You've successfully run and modified your React Native App. :partying_face:

### Now what?

- If you want to add this new React Native code to an existing application, check out the [Integration guide](https://reactnative.dev/docs/integration-with-existing-apps).
- If you're curious to learn more about React Native, check out the [docs](https://reactnative.dev/docs/getting-started).

# Troubleshooting

If you're having issues getting the above steps to work, see the [Troubleshooting](https://reactnative.dev/docs/troubleshooting) page.

# Learn More

To learn more about React Native, take a look at the following resources:

- [React Native Website](https://reactnative.dev) - learn more about React Native.
- [Getting Started](https://reactnative.dev/docs/environment-setup) - an **overview** of React Native and how setup your environment.
- [Learn the Basics](https://reactnative.dev/docs/getting-started) - a **guided tour** of the React Native **basics**.
- [Blog](https://reactnative.dev/blog) - read the latest official React Native **Blog** posts.
- [`@facebook/react-native`](https://github.com/facebook/react-native) - the Open Source; GitHub **repository** for React Native.

# Stream resolver flow (remote)

The JavaScript that turns a movie/episode into a playable `master.m3u8` URL is
**not** hand-written in the app bundle. It lives in [worker.js](./worker.js) and
is consumed by [resolveFlow.js](./src/components/resolveFlow.js) and
[FetchVideoComponent.js](./src/components/FetchVideoComponent.js).

## How it runs

1. The flow is downloaded from the worker once and cached in `AsyncStorage`;
   the copy bundled in [defaultFlow.js](./src/components/defaultFlow.js) is used
   when the worker is unreachable and nothing is cached yet.
2. It is injected into a hidden `WebView`, which walks the provider chain:
   embed page → `/vs_src.php` gate token → player-host landing page →
   nested player page (`window.CONFIG.apiToken`) → `&stream_urls` API →
   `<stream-host>/generate.php` playlist token.
3. The flow returns the playlist url together with the **document it ran in**
   (`docOrigin`) and the provider's player page (`playerUrl`). That context is
   not cosmetic: the CDN only serves playlists and chunks to requests that come
   from those pages, so the app keeps a hidden and fetches everything from
   there (see "Local stream server" below).
4. If resolution fails, the flow is downloaded again. A **new version** is
   retried immediately; the **same version** means the provider is broken, so
   the player shows "Media streaming is currently facing issues. Please try
   again later." A resolution whose url cannot even be read also invalidates
   the cached flow, since that is usually a stale flow rather than an outage.

# Local stream server

`react-native-video` (ExoPlayer) cannot talk to the provider: the CDN answers
the app's own HTTP stack with a Cloudflare block page. Playback therefore goes
through a loopback server instead.

| Module | Role |
| --- | --- |
| [webFetch.js](./src/stream/webFetch.js) | hidden `WebView` that performs the actual CDN requests, in the page context the CDN accepts; binary responses come back base64 |
| [playlists.js](./src/stream/playlists.js) | pure HLS helpers: parse master/media playlists and rewrite them to local urls |
| [manager.js](./src/stream/manager.js) | turns a resolved url into a stream record (qualities + chunks) and downloads/caches chunks |
| [server.js](./src/stream/server.js) | `react-native-nitro-http-server` on `127.0.0.1`: serves the ghost playlists and the chunks |
| [store.js](./src/stream/store.js) | zustand + AsyncStorage state (resolved streams and download progress) |
| [DownloadHost.js](./src/stream/DownloadHost.js) | runs the download queue, resolving unseen items with a hidden `FetchVideoComponent` |

Flow of a playback:

1. the resolved `master.m3u8` is read once and its qualities/chunk lists are
   stored, so the player never re-reads a playlist mid-session;
2. the player is pointed at `http://127.0.0.1:<port>/s/<key>/<quality>/playlist.m3u8`
   (the best quality by default, every quality is offered in the menu);
3. each chunk request is answered from `DocumentDirectoryPath/tefrija-streams`
   or, on a miss, downloaded through the WebView first;
4. once every chunk of a quality is on disk the item plays with no network at
   all — the cached stream record supplies the playlist.

Downloads ([DownloadsScreen.js](./src/screens/DownloadsScreen.js), plus buttons
on the movie/episode screens) reuse the same machinery: an item is resolved,
then its chunks are fetched three at a time. Progress is kept in the store and
counted from what is already on disk, so navigating away (or restarting) resumes
a download instead of restarting it. Removing a download from the list cancels
it.

Up to three items download at the same time (three chunks each), so a whole
season does not wait for the previous episode to finish.

The downloads screen groups episodes under their show, shows the progress of
each one as a percentage, and offers play / pause / resume per row; deleting a
download asks for confirmation first and then removes its files. Series details
show the state of every episode on its download button (`progress-download`
while it runs, `pause-circle` when paused, `check-circle` when stored).

Chunks are stored per quality under a name derived from the *resolution*
(`tefrija-streams/<key>/1920x800/…`), because the provider reorders qualities and
reports a different bandwidth on every resolve.

Two failure modes are handled differently:

- a chunk that fails with 403/429/5xx (or a dead connection) is retried with
  backoff, and the item is resolved once more in case the playlist token went
  stale — download continues from the cached chunks;
- a chunk that answers 404 is gone for good: it is parked, the rest of the
  download carries on, and the finished item records it as missing. The ghost
  playlist then leaves that chunk out and marks the gap with
  `#EXT-X-DISCONTINUITY`, so playback jumps over it instead of failing.

Subtitles are cached the same way: the search result list and the decoded
subtitle text are stored under `DocumentDirectoryPath/subtitles`, and a cached
copy is used before going back to the network.

## Debugging on a device

[scripts/rn-probe.js](./scripts/rn-probe.js) attaches to the running app through
Metro's CDP proxy: `--logs` tails console output, `--eval "..."` and
`--eval-async "..."` run code in the app's JS runtime.

[scripts/flow-server.js](./scripts/flow-server.js) serves `FLOW_SCRIPT` over
`http://10.0.2.2:8099/v1/flow` so flow edits can be tried on an emulator without
deploying the worker (point `RESOLVE_FLOW_ENDPOINT` at it temporarily).

## Fixing a provider change

1. Edit `FLOW_SCRIPT` in [worker.js](./worker.js).
2. `npm run sync-flow` — regenerates the bundled copy so both agree byte for
   byte (same content ⇒ same version hash).
3. Upload `worker.js` to Cloudflare. Installed apps pick the new flow up on
   their next failed attempt; no app release needed.

The version in `/v1/flow` is a content hash of `FLOW_SCRIPT`, so it changes
whenever the script does.

Worker routes:

| Route | Description |
| --- | --- |
| `GET /` | service name, current flow version, available routes |
| `GET /v1/flow` | `{version, updatedAt, servedAt, script}` — what the app reads |
| `GET /v1/flow/raw` | the raw flow script as `text/plain` |

Notable provider requirements the flow encodes (they change):

- the landing page only answers with a `Referer` from the embed page, so the
  hop is done in-page with `location.replace`;
- `data.vidsrc.sh/api.php?...&stream_urls` needs the single-use `api_token`
  minted in the nested player page's `window.CONFIG`, and `stream_urls` comes
  back WASM-encrypted (`vsdec.js` exposes `vsFetchJSON`);
- that same `api_token` must be forwarded to `<stream-host>/generate.php` as
  `?api_token=`, otherwise it answers `403 invalid or mismatched api token`;
- stream hosts rotate per request (`nectarandnectary.space`,
  `indigoinksociety.space`, …), so never hardcode them;
- the playlist/chunk CDN refuses requests whose document is not one of the
  provider's pages (a direct visit, `curl`, okhttp and ExoPlayer all get the
  Cloudflare block page), and it does not send CORS headers for credentialed
  requests — the fetch must be made with `credentials: 'omit'` from the
  provider's own page for the response to be readable.

The flow deliberately **fails** when it cannot mint a playlist token instead of
returning a bare `master.m3u8`. A tokenless URL only surfaces later as a player
error, and a flow that "succeeds" that way would never be refreshed — the app
treats an untokened resolution as a failure too, so a stale cached flow heals
itself on the next attempt.
