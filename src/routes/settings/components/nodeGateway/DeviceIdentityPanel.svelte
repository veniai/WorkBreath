<script>
  import { t } from '$lib/i18n/index.js';
  export let config;
  export let nodeStatus = { deviceId: '', protocolVersion: '', deviceName: '' };
</script>

<div class="rounded-2xl border border-slate-200/80 bg-slate-50/90 p-4 dark:border-[var(--surface-border-default)] dark:bg-[#2c2c2e]/40">
  <div class="flex items-center gap-2 mb-3">
    <div class="flex h-6 w-6 items-center justify-center rounded-md bg-brand-100 dark:bg-brand-900/30">
      <svg class="w-3.5 h-3.5 text-brand-600 dark:text-brand-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    </div>
    <span class="text-sm font-medium text-slate-700 dark:text-[#98989d]">{t('nodeGatewayPage.deviceIdentity')}</span>
    <span class="settings-chip-neutral">{nodeStatus.protocolVersion}</span>
  </div>
  <div class="space-y-2">
    <div class="flex items-center justify-between gap-2 rounded-lg bg-white/70 px-3 py-1.5 ring-1 ring-slate-200/70 dark:bg-[#1c1c1e]/20 dark:ring-[var(--surface-border-default)]">
      <span class="text-xs text-slate-500 dark:text-[#86868b]">{t('nodeGatewayPage.deviceId')}</span>
      <span class="font-mono text-xs text-slate-700 dark:text-[#98989d]" title={nodeStatus.deviceId}>{nodeStatus.deviceId}</span>
    </div>
    <label class="block">
      <span class="text-xs text-slate-500 dark:text-[#86868b]">{t('nodeGatewayPage.deviceName')}</span>
      <input
        type="text"
        bind:value={config.node_gateway.device_name}
        class="mt-0.5 w-full rounded-lg bg-white/70 px-3 py-1.5 text-sm text-slate-900 ring-1 ring-slate-200/70 focus:ring-brand-400 dark:bg-[#1c1c1e]/20 dark:text-[#f5f5f7] dark:ring-[var(--surface-border-default)] dark:focus:ring-brand-500 focus:outline-none"
        placeholder={nodeStatus.deviceName}
      />
    </label>
    <p class="text-[11px] text-slate-400 dark:text-[#636c76]">{t('nodeGatewayPage.deviceNameHint')}</p>
  </div>
</div>
