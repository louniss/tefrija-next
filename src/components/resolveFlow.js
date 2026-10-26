import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Remote stream-resolver flow.
 *
 * The JavaScript that resolves an m3u8 URL lives in a Cloudflare Worker
 * (see worker.js) instead of the app bundle, so it can be fixed without an app
 * release. It is downloaded once, cached locally, and only re-downloaded after
 * a resolution failure — if the worker still serves the same version, the
 * failure is upstream and the app reports it to the user.
 */

export const RESOLVE_FLOW_ENDPOINT =
  'https://lively-disk-1187.abcwork.workers.dev/v1/flow';

// Set the same value on the worker as FLOW_TOKEN to require it.
const FLOW_TOKEN = '';

export const STREAM_UNAVAILABLE_MESSAGE =
  'Media streaming is currently facing issues. Please try again later.';

const STORAGE_KEY = 'tefrija.resolveFlow';
const REQUEST_TIMEOUT_MS = 10000;

let memoryFlow = null;

const isValidFlow = flow =>
  !!flow &&
  typeof flow.version === 'string' &&
  flow.version.length > 0 &&
  typeof flow.script === 'string' &&
  flow.script.length > 100 &&
  flow.script.indexOf('ReactNativeWebView.postMessage') !== -1;

async function persist(flow) {
  memoryFlow = flow;
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(flow));
  } catch (e) {
    // A missing cache only costs one extra download next launch.
    console.log('could not cache resolve flow', e);
  }
}

/**
 * Downloads the flow and caches it. Throws when the worker is unreachable or
 * answers with something unusable.
 */
export async function fetchRemoteFlow() {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const headers = {accept: 'application/json'};
    if (FLOW_TOKEN) {
      headers['x-flow-token'] = FLOW_TOKEN;
    }
    const response = await fetch(RESOLVE_FLOW_ENDPOINT, {
      headers,
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new Error(`flow worker HTTP ${response.status}`);
    }
    const payload = await response.json();
    if (!isValidFlow(payload)) {
      throw new Error('malformed flow payload');
    }
    const flow = {
      version: payload.version,
      script: payload.script,
      updatedAt: payload.updatedAt,
      fetchedAt: Date.now(),
    };
    await persist(flow);
    return flow;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Downloads the flow and reports whether it differs from the one in use, so the
 * caller can decide between "retry with the new flow" and "nothing changed
 * upstream, report the outage".
 */
export async function refreshFlow(currentVersion) {
  const flow = await fetchRemoteFlow();
  return {flow, changed: !currentVersion || flow.version !== currentVersion};
}

/**
 * The flow to use now: the cached copy when there is one, otherwise a fresh
 * download. Throws only when there is no cache and the download fails.
 */
export async function getFlow() {
  if (memoryFlow) {
    return memoryFlow;
  }
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw) {
      const cached = JSON.parse(raw);
      if (isValidFlow(cached)) {
        memoryFlow = cached;
        return cached;
      }
    }
  } catch (e) {
    console.log('could not read cached resolve flow', e);
  }
  return fetchRemoteFlow();
}
