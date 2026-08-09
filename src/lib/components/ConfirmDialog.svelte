<script>
  import { confirmDialog, resolveConfirm } from '$lib/stores/confirm.js';
  import { t } from '$lib/i18n/index.js';
  import { trapFocus } from '$lib/utils/focusTrap.js';

  const toneMap = {
    info: {
      className: 'confirm-dialog-tone-info',
      buttonClass: 'confirm-dialog-button-primary',
    },
    warning: {
      className: 'confirm-dialog-tone-warning',
      buttonClass: 'confirm-dialog-button-warning',
    },
    error: {
      className: 'confirm-dialog-tone-danger',
      buttonClass: 'confirm-dialog-button-danger',
    },
    danger: {
      className: 'confirm-dialog-tone-danger',
      buttonClass: 'confirm-dialog-button-danger',
    },
  };

  $: dialogState = $confirmDialog;
  $: tone = toneMap[dialogState?.tone] || toneMap.info;

  function handleKeydown(event) {
    if (!dialogState) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopImmediatePropagation();
      resolveConfirm(false);
    }
  }
</script>

<svelte:window on:keydown|capture={handleKeydown} />

{#if dialogState}
  <div class="modal-overlay confirm-dialog-overlay fixed inset-0 z-[200]">
    <button
      type="button"
      class="modal-backdrop-button"
      aria-label={t('window.close')}
      on:click={() => resolveConfirm(false)}
    ></button>

    <section
      use:trapFocus
      class={`modal-panel confirm-dialog-panel ${tone.className}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      aria-describedby="confirm-dialog-description"
      tabindex="-1"
    >
      <header class="modal-header confirm-dialog-header">
        <h3 id="confirm-dialog-title" class="modal-title">
          {dialogState.title}
        </h3>
        <button
          type="button"
          class="modal-close"
          aria-label={t('window.close')}
          on:click={() => resolveConfirm(false)}
        >
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
            <path stroke-linecap="round" d="M6 6l12 12M18 6 6 18" />
          </svg>
        </button>
      </header>

      <div class="modal-body confirm-dialog-body">
        <span class="confirm-dialog-icon" aria-hidden="true">
          {#if dialogState.tone === 'info'}
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
              <circle cx="12" cy="12" r="8.5" />
              <path stroke-linecap="round" d="M12 10.5v5M12 7.8h.01" />
            </svg>
          {:else}
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
              <path stroke-linejoin="round" d="M10.3 4.5 3.1 17a2 2 0 0 0 1.73 3h14.34a2 2 0 0 0 1.73-3L13.7 4.5a1.96 1.96 0 0 0-3.4 0Z" />
              <path stroke-linecap="round" d="M12 9v4.25M12 16.4h.01" />
            </svg>
          {/if}
        </span>
        <p id="confirm-dialog-description" class="confirm-dialog-message">
          {dialogState.message}
        </p>
      </div>

      <footer class="modal-footer confirm-dialog-footer">
        <button
          type="button"
          class="confirm-dialog-button"
          data-autofocus="true"
          on:click={() => resolveConfirm(false)}
        >
          {dialogState.cancelText}
        </button>
        <button
          type="button"
          class={`confirm-dialog-button confirm-dialog-button-confirm ${tone.buttonClass}`}
          on:click={() => resolveConfirm(true)}
        >
          {dialogState.confirmText}
        </button>
      </footer>
    </section>
  </div>
{/if}
