import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import { expect, it } from 'vitest';

const fiberSource = readFileSync(new URL('../extension/fiber.js', import.meta.url), 'utf8');

it('reads connector.actions and marks only the current Refresh tools control on the path-routed plugin page', async () => {
  const appId = 'asdk_app_synthetic';
  const page = new JSDOM('<button id="refresh">Localized refresh label</button><button id="delete">Delete</button>', {
    url: `https://chatgpt.com/settings/plugins-settings/plugin_${appId}`,
    runScripts: 'outside-only', pretendToBeVisual: true
  });
  const { window } = page;
  Object.defineProperty(window.HTMLElement.prototype, 'getClientRects', { value() { return [{}]; } });
  const chain = (memoizedProps: any, parent: any = null) => ({ memoizedProps, return: parent });
  const connector = {
    id: appId, name: 'Chat On Steroids Core', app_metadata: { version_id: 'asdk_app_v_current' },
    actions: [{ name: 'read', description: 'Read current.', description_model: '', params: { type: 'object', properties: {} } }]
  };
  const owner = chain({ connector, link: { actions: ['read'] }, plugin: {} });
  const refresh = window.document.getElementById('refresh') as any;
  refresh.__reactFiber$fixture = chain({ children: { props: { id: 'browserPluginSettings.refreshActions' } } }, owner);
  (window.document.getElementById('delete') as any).__reactFiber$fixture = chain({ children: { props: { id: 'browserPluginSettings.deleteApp' } } }, owner);
  window.postMessage = data => queueMicrotask(() => window.dispatchEvent(new window.MessageEvent('message', { data, source: window as any, origin: window.location.origin })));
  window.eval(fiberSource);
  const reply = await new Promise<any>((resolve) => {
    window.addEventListener('message', (event: MessageEvent) => { if (event.data?.source === 'clf-plugin-reply') resolve(event.data.plugin); });
    window.postMessage({ source: 'clf-plugin-ask', nonce: 'plugin-current-shell' }, window.location.origin);
  });
  expect(reply).toMatchObject({ appId, connectorName: 'Chat On Steroids Core', versionId: 'asdk_app_v_current', refreshAvailable: true,
    tools: [{ name: 'read', description: 'Read current.', inputSchema: { type: 'object', properties: {} } }] });
  expect(refresh.getAttribute('data-clf-plugin-refresh')).toBe(appId);
  expect(window.document.getElementById('delete')!.hasAttribute('data-clf-plugin-refresh')).toBe(false);
  page.window.close();
});

it('accepts a current first-party connector with more than sixteen tools', async () => {
  const appId = 'asdk_app_desktop';
  const page = new JSDOM('<button id="refresh">Refresh tools</button>', {
    url: `https://chatgpt.com/settings/plugins-settings/plugin_${appId}`,
    runScripts: 'outside-only', pretendToBeVisual: true
  });
  const { window } = page;
  Object.defineProperty(window.HTMLElement.prototype, 'getClientRects', { value() { return [{}]; } });
  const chain = (memoizedProps: any, parent: any = null) => ({ memoizedProps, return: parent });
  const connector = {
    id: appId, name: 'Chat On Steroids Desktop',
    actions: Array.from({ length: 24 }, (_, i) => ({ name: `desktop_tool_${i}`, description: `Desktop tool ${i}`, params: { type: 'object', properties: {} } }))
  };
  const refresh = window.document.getElementById('refresh') as any;
  refresh.__reactFiber$fixture = chain({ children: { props: { id: 'browserPluginSettings.refreshActions' } } }, chain({ connector }));
  window.postMessage = data => queueMicrotask(() => window.dispatchEvent(new window.MessageEvent('message', { data, source: window as any, origin: window.location.origin })));
  window.eval(fiberSource);
  const reply = await new Promise<any>((resolve) => {
    window.addEventListener('message', (event: MessageEvent) => { if (event.data?.source === 'clf-plugin-reply') resolve(event.data.plugin); });
    window.postMessage({ source: 'clf-plugin-ask', nonce: 'desktop-current-shell' }, window.location.origin);
  });
  expect(reply?.connectorName).toBe('Chat On Steroids Desktop');
  expect(reply?.tools).toHaveLength(24);
  page.window.close();
});
