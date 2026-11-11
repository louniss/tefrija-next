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
3. If resolution fails, the flow is downloaded again. A **new version** is
   retried immediately; the **same version** means the provider is broken, so
   the player shows "Media streaming is currently facing issues. Please try
   again later."

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
  `indigoinksociety.space`, …), so never hardcode them.
