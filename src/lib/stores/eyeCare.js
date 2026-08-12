import { writable } from 'svelte/store';

/**
 * 护眼运行状态的唯一前端通道。
 *
 * App.svelte 负责首次读取并消费后端每秒广播的 eye-care-status-changed；
 * 概览和护眼页只订阅此 store，避免每个页面重复轮询后端。
 */
const DEFAULT_STATE = null;

function createEyeCareStore() {
  const { subscribe, set } = writable(DEFAULT_STATE);

  return {
    subscribe,
    set,
    reset: () => set(DEFAULT_STATE),
  };
}

export const eyeCareStore = createEyeCareStore();
