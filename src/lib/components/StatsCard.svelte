<script>
  export let title = '';
  export let value = '';
  export let icon = '';
  export let color = 'indigo';
  export let href = null;
  export let embedded = false;
  export let compact = false;
  export let subtitle = null;

  const iconColors = {
    indigo: 'text-primary-500 dark:text-primary-400',
    emerald: 'text-emerald-500 dark:text-emerald-400',
    amber: 'text-amber-500 dark:text-amber-400',
    rose: 'text-rose-500 dark:text-rose-400',
    blue: 'text-blue-500 dark:text-blue-400',
    violet: 'text-violet-500 dark:text-violet-400',
  };

  const iconBgs = {
    indigo: 'bg-primary-50 dark:bg-primary-900/40',
    emerald: 'bg-emerald-50 dark:bg-emerald-950/40',
    amber: 'bg-amber-50 dark:bg-amber-950/40',
    rose: 'bg-rose-50 dark:bg-rose-950/40',
    blue: 'bg-blue-50 dark:bg-blue-950/40',
    violet: 'bg-violet-50 dark:bg-violet-950/40',
  };

  $: cardClass = embedded
    ? 'stats-card block min-h-[108px] rounded-[22px] bg-slate-50/88 px-4 py-4 dark:bg-[#1c1c1e]/30'
    : compact
      ? 'stats-card stats-card-compact block min-w-0 px-4 py-3.5'
      : 'stats-card block min-h-[116px] rounded-2xl bg-[var(--editorial-surface-featured)] p-5';
  $: iconClass = embedded
    ? `stats-card-icon flex h-10 w-10 items-center justify-center rounded-2xl ${iconBgs[color]} ${iconColors[color]} shrink-0`
    : `stats-card-icon flex h-11 w-11 items-center justify-center rounded-2xl ${iconBgs[color]} ${iconColors[color]} shrink-0`;
  $: valueClass = embedded
    ? 'stats-card-value mt-4 whitespace-nowrap text-[1.9rem] font-semibold leading-none text-slate-900 dark:text-[#f5f5f7]'
    : compact
      ? 'stats-card-value mt-1.5 whitespace-nowrap text-[1.55rem] font-semibold leading-none text-slate-900'
      : 'stats-card-value mt-6 whitespace-nowrap text-[2.15rem] font-semibold leading-none text-slate-900 dark:text-[#f5f5f7]';
  $: interactiveClass = embedded
    ? 'transition-colors duration-150 hover:bg-slate-100/90 dark:hover:bg-[rgba(255,255,255,0.06)]'
    : 'transition-colors duration-150 hover:bg-slate-50 dark:hover:bg-[rgba(255,255,255,0.04)] cursor-pointer group';
</script>

{#if href}
  <a
    {href}
    class="{cardClass} {interactiveClass}"
  >
    <div class="flex h-full items-center justify-between gap-4">
      <div class="min-w-0 flex-1">
        <span class="stats-card-title text-[13px] font-medium text-slate-500 dark:text-[#86868b] leading-none">{title}</span>
        <p class={valueClass}>{value}</p>
        {#if subtitle}
          <p class="stats-card-subtitle mt-1.5 text-xs font-medium leading-none text-slate-500 dark:text-[#86868b]">{subtitle}</p>
        {/if}
      </div>
      {#if !compact}<div class={iconClass}>
        {#if icon === 'duration'}
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M12 7v5l3 2m6-2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        {:else if icon === 'focus'}
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M4 10V7a3 3 0 013-3h3m4 0h3a3 3 0 013 3v3m0 4v3a3 3 0 01-3 3h-3m-4 0H7a3 3 0 01-3-3v-3" />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M9 12h6" />
          </svg>
        {:else if icon === 'browser'}
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M3 12h18M12 3a15.3 15.3 0 014 9 15.3 15.3 0 01-4 9 15.3 15.3 0 01-4-9 15.3 15.3 0 014-9Z" />
            <circle cx="12" cy="12" r="9" stroke-width="1.8" />
          </svg>
        {:else if icon === 'apps'}
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <rect x="4" y="4" width="7" height="7" rx="2" stroke-width="1.8" />
            <rect x="13" y="4" width="7" height="7" rx="2" stroke-width="1.8" />
            <rect x="4" y="13" width="7" height="7" rx="2" stroke-width="1.8" />
            <rect x="13" y="13" width="7" height="7" rx="2" stroke-width="1.8" />
          </svg>
        {/if}
      </div>{/if}
    </div>
  </a>
{:else}
  <div class={cardClass}>
    <div class="flex h-full items-center justify-between gap-4">
      <div class="min-w-0 flex-1">
        <span class="stats-card-title text-[13px] font-medium text-slate-500 dark:text-[#86868b] leading-none">{title}</span>
        <p class={valueClass}>{value}</p>
        {#if subtitle}
          <p class="stats-card-subtitle mt-1.5 text-xs font-medium leading-none text-slate-500 dark:text-[#86868b]">{subtitle}</p>
        {/if}
      </div>
      {#if !compact}<div class={iconClass}>
        {#if icon === 'duration'}
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M12 7v5l3 2m6-2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        {:else if icon === 'focus'}
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M4 10V7a3 3 0 013-3h3m4 0h3a3 3 0 013 3v3m0 4v3a3 3 0 01-3 3h-3m-4 0H7a3 3 0 01-3-3v-3" />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M9 12h6" />
          </svg>
        {:else if icon === 'browser'}
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M3 12h18M12 3a15.3 15.3 0 014 9 15.3 15.3 0 01-4 9 15.3 15.3 0 01-4-9 15.3 15.3 0 014-9Z" />
            <circle cx="12" cy="12" r="9" stroke-width="1.8" />
          </svg>
        {:else if icon === 'apps'}
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <rect x="4" y="4" width="7" height="7" rx="2" stroke-width="1.8" />
            <rect x="13" y="4" width="7" height="7" rx="2" stroke-width="1.8" />
            <rect x="4" y="13" width="7" height="7" rx="2" stroke-width="1.8" />
            <rect x="13" y="13" width="7" height="7" rx="2" stroke-width="1.8" />
          </svg>
        {/if}
      </div>{/if}
    </div>
  </div>
{/if}
