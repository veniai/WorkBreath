<script>
  import { onMount, onDestroy, tick } from 'svelte';
  import { invoke } from '@tauri-apps/api/core';
  import StatsCard from '../lib/components/StatsCard.svelte';
  import AppUsageChart from '../lib/components/AppUsageChart.svelte';
  import ActivityHourlyChart from '../lib/components/ActivityHourlyChart.svelte';
  import LocalizedDatePicker from '../lib/components/LocalizedDatePicker.svelte';
  import { cache } from '../lib/stores/cache.js';
  import { recordingStore, isActiveRecording } from '../lib/stores/recording.js';
  import { eyeCareStore } from '../lib/stores/eyeCare.js';
  import { showToast } from '../lib/stores/toast.js';
  import { preloadAppIcons } from '../lib/stores/iconCache.js';
  import {
    formatDurationLocalized,
    formatLocalizedDate,
    formatLocalizedTime,
    locale,
    t,
    translateCategoryLabel,
    translateSemanticCategoryLabel,
  } from '$lib/i18n/index.js';
  import { formatUserError } from '$lib/utils/errorDisplay.js';
  import { trapFocus } from '$lib/utils/focusTrap.js';
  import { formatBrowserUrlForDisplay } from '../lib/utils/browserUrl.js';
  import { getViewportPopoverPlacement } from '../lib/utils/popoverPosition.js';
  import { semanticCategoryStore } from '../lib/stores/categories.js';
  import {
    buildDomainPresentation,
    getSemanticCategoryColor,
  } from './overviewDomainPresentation.js';
  import { buildCategoryCompositionSummary } from './overviewCategoryPresentation.js';

  function getLocalDateString() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function parseDateString(dateValue) {
    return new Date(`${dateValue}T12:00:00`);
  }

  function getDateRangeLabel(dateFrom, dateTo) {
    if (!dateFrom && !dateTo) {
      return '';
    }
    if (dateFrom && !dateTo) {
      return formatLocalizedDate(parseDateString(dateFrom), {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        weekday: 'short',
      });
    }
    if (!dateFrom && dateTo) {
      return formatLocalizedDate(parseDateString(dateTo), {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        weekday: 'short',
      });
    }
    if (dateFrom === dateTo) {
      return formatLocalizedDate(parseDateString(dateFrom), {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        weekday: 'short',
      });
    }
    return `${formatLocalizedDate(parseDateString(dateFrom), { year: 'numeric', month: 'short', day: 'numeric' })} - ${formatLocalizedDate(parseDateString(dateTo), { year: 'numeric', month: 'short', day: 'numeric' })}`;
  }

  function getWeekRangeLabel(dateValue) {
    const anchor = parseDateString(dateValue);
    const monday = new Date(anchor);
    monday.setDate(anchor.getDate() - ((anchor.getDay() + 6) % 7));
    return `${formatLocalizedDate(monday, { year: 'numeric', month: 'short', day: 'numeric' })} - ${formatLocalizedDate(anchor, { year: 'numeric', month: 'short', day: 'numeric' })}`;
  }

  function getWeekDateRange(dateValue) {
    const anchor = parseDateString(dateValue);
    const monday = new Date(anchor);
    monday.setDate(anchor.getDate() - ((anchor.getDay() + 6) % 7));
    return {
      dateFrom: formatIsoDate(monday),
      dateTo: formatIsoDate(anchor),
    };
  }

  function formatIsoDate(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }

  function shiftIsoDate(dateValue, offsetDays) {
    const next = parseDateString(dateValue);
    next.setDate(next.getDate() + offsetDays);
    return formatIsoDate(next);
  }

  function diffIsoDateDays(leftDateValue, rightDateValue) {
    const dayInMs = 24 * 60 * 60 * 1000;
    return Math.round((parseDateString(leftDateValue) - parseDateString(rightDateValue)) / dayInMs);
  }

  // 应用投入保留用户偏好的展示方式；今日节奏固定使用竖向小时图。
  const APP_USAGE_VIEW_MODE_KEY = 'overview.appUsage.viewMode';

  let stats = null;
  let loading = true;
  let error = null;
  let currentTime = new Date();
  let overviewMode = 'today';
  let selectedCompositionCategory = null;
  let selectedDateFrom = getLocalDateString();
  let selectedDateTo = getLocalDateString();
  let clockInterval;
  let refreshInterval;
  let refreshDebounceTimer;
  let handleActivityAdded;
  let handleVisibilityChange;
  let overviewRefreshPromise = null;
  let overviewRefreshKey = '';
  let overviewRequestId = 0;
  const OVERVIEW_FALLBACK_REFRESH_MS = 120000;
  const OVERVIEW_EVENT_DEBOUNCE_MS = 750;
  let lastCheckDate = currentTime.getDate();
  let appUsageViewMode = 'row';
  let domainUsageExpanded = false;
  let expandedDomainUsageItems = [];
  let domainUsageLoading = false;
  let domainUsageRequestId = 0;
  // #104: 按分类着色的柱状图（堆叠）
  let hourlyAppBreakdown = [];
  let categoryList = [];
  let workGoalMinutes = null;
  let togglingEyeCarePause = false;
  // ── 2026-07 概览改版 ──
  // 上周同日基线（today 模式的 KPI 差值与洞察条；加载失败时保持 null，不显示 delta）
  let lastWeekStats = null;
  let lastWeekStatsDate = null;
  let lastWeekStatsPromise = null;
  // week/date 模式「按天投入」：来自新命令 get_range_daily_totals
  let rangeDailyTotals = [];
  let rangeDailyLoading = false;
  let rangeDailyRequestId = 0;
  let hourlyBreakdownRequestId = 0;
  function getHourlyBreakdownRange() {
    if (overviewMode === 'week') {
      return getWeekDateRange(getLocalDateString());
    }
    if (overviewMode === 'date') {
      return {
        dateFrom: selectedDateFrom,
        dateTo: selectedDateTo,
      };
    }
    const today = getLocalDateString();
    return {
      dateFrom: today,
      dateTo: today,
    };
  }

  async function loadHourlyBreakdown() {
    const range = getHourlyBreakdownRange();
    const requestId = ++hourlyBreakdownRequestId;
    try {
      const breakdown = await invoke('get_hourly_app_breakdown', {
        mode: overviewMode,
        date: range.dateTo,
        dateFrom: range.dateFrom,
        dateTo: range.dateTo,
      });
      if (requestId === hourlyBreakdownRequestId) {
        hourlyAppBreakdown = breakdown;
      }
    } catch (e) {
      if (requestId === hourlyBreakdownRequestId) {
        hourlyAppBreakdown = [];
      }
    }
  }
  // 切换日期时刷新 hourly 分类细分
  $: { overviewMode; selectedDateFrom; selectedDateTo; if (categoryList.length) loadHourlyBreakdown(); }

  // week/date 模式的「按天投入」数据（today 模式不显示该卡，直接清空）
  async function loadRangeDailyTotals() {
    if (overviewMode === 'today') {
      rangeDailyTotals = [];
      return;
    }
    const range = getHourlyBreakdownRange();
    const requestId = ++rangeDailyRequestId;
    rangeDailyLoading = true;
    try {
      const totals = await invoke('get_range_daily_totals', {
        dateFrom: range.dateFrom,
        dateTo: range.dateTo,
      });
      if (requestId === rangeDailyRequestId) {
        rangeDailyTotals = totals;
      }
    } catch (e) {
      if (requestId === rangeDailyRequestId) {
        rangeDailyTotals = [];
      }
    } finally {
      if (requestId === rangeDailyRequestId) {
        rangeDailyLoading = false;
      }
    }
  }
  // 切换模式/日期时刷新按天投入
  $: { overviewMode; selectedDateFrom; selectedDateTo; loadRangeDailyTotals(); }

  // today 模式并行拉取「上周同日」基线；绕过 overview 缓存
  // （cache.setOverview 只保存一份"今天"快照，写入 date 模式数据会互相污染），
  // 同日期仅拉一次，失败保持 null（界面不显示 delta）。
  function ensureLastWeekBaseline() {
    if (overviewMode !== 'today') {
      return;
    }
    const baselineDate = shiftIsoDate(getLocalDateString(), -7);
    if (lastWeekStatsDate === baselineDate && (lastWeekStats || lastWeekStatsPromise)) {
      return;
    }
    lastWeekStatsDate = baselineDate;
    lastWeekStatsPromise = invoke('get_overview_stats', {
      mode: 'date',
      dateFrom: baselineDate,
      dateTo: baselineDate,
    })
      .then((baseline) => {
        lastWeekStats = baseline;
      })
      .catch((e) => {
        console.warn('加载上周同日基线失败:', e);
        lastWeekStats = null;
      })
      .finally(() => {
        lastWeekStatsPromise = null;
      });
  }
  $: hourlyCategoryColors = categoryList.reduce((acc, c) => {
    acc[c.key] = c.color;
    return acc;
  }, {});
  $: hourlyCategoryNames = categoryList.reduce((acc, c) => {
    currentLocale;
    const translatedCategoryName = translateCategoryLabel(c.key);
    const isKnownSystemCategory = c.is_system || translatedCategoryName !== c.key;
    acc[c.key] = isKnownSystemCategory ? translatedCategoryName : (c.name || translatedCategoryName);
    return acc;
  }, {});
  $: hourlyCategoryBreakdown = hourlyAppBreakdown.reduce((acc, bucket) => {
    const cats = {};
    for (const app of bucket.apps || []) {
      const k = app.category || 'other';
      cats[k] = (cats[k] || 0) + app.duration;
    }
    acc[bucket.hour] = Object.entries(cats).map(([category, duration]) => ({ category, duration }));
    return acc;
  }, {});

  // ── 分类构成（构成条+图例、娱乐占比 KPI、洞察句主分类共用）：
  //    与 KPI 总投入/应用列表同源，优先 stats.category_usage（逐条裁剪口径）；
  //    缺失或为空时回退到 hourlyCategoryBreakdown 跨小时求和。
  //    小时图本身不动（小时口径，与日合计允许既知偏差）。
  $: hourlyCompositionTotals = Object.values(hourlyCategoryBreakdown).reduce((acc, segments) => {
    for (const segment of segments || []) {
      acc[segment.category] = (acc[segment.category] || 0) + segment.duration;
    }
    return acc;
  }, {});
  $: compositionTotals = stats?.category_usage?.length
    ? stats.category_usage.reduce((acc, item) => {
        acc[item.category] = (acc[item.category] || 0) + item.duration;
        return acc;
      }, {})
    : hourlyCompositionTotals;
  $: compositionTotalDuration = Object.values(compositionTotals).reduce((sum, duration) => sum + duration, 0);
  $: compositionSegments = compositionTotalDuration > 0
    ? Object.entries(compositionTotals)
        .map(([category, duration]) => ({
          category,
          duration,
          name: hourlyCategoryNames[category] || category,
          color: hourlyCategoryColors[category] || '#94a3b8',
          widthPct: (duration / compositionTotalDuration) * 100,
          percent: Math.round((duration / compositionTotalDuration) * 100),
        }))
        .sort((left, right) => right.duration - left.duration)
    : [];

  $: selectedCompositionSummary = selectedCompositionCategory
    ? buildCategoryCompositionSummary({
        category: selectedCompositionCategory,
        compositionTotals,
        hourlyBreakdown: hourlyCategoryBreakdown,
        appBreakdown: hourlyAppBreakdown,
      })
    : null;

  function toggleCompositionCategory(category) {
    selectedCompositionCategory = selectedCompositionCategory === category ? null : category;
  }

  function clearSelectedCompositionCategory() {
    selectedCompositionCategory = null;
  }

  function formatCompositionActiveRange(activeRange) {
    if (!activeRange) return t('overview.compositionNoActiveRange');
    return `${String(activeRange.startHour).padStart(2, '0')}:00–${String(activeRange.endHour + 1).padStart(2, '0')}:00`;
  }

  // ── 专注峰值：hourly 分布最大桶向相邻延伸（相邻桶 ≥ 最大值 60% 时并入窗口） ──
  function computePeakWindow(distribution) {
    const buckets = Array.from({ length: 24 }, (_, hour) => {
      const found = (distribution || []).find((bucket) => bucket.hour === hour);
      return found?.duration || 0;
    });
    const maxDuration = Math.max(...buckets);
    if (maxDuration <= 0) {
      return null;
    }
    const peakHour = buckets.indexOf(maxDuration);
    const threshold = maxDuration * 0.6;
    let startHour = peakHour;
    let endHour = peakHour;
    while (startHour > 0 && buckets[startHour - 1] >= threshold) {
      startHour -= 1;
    }
    while (endHour < 23 && buckets[endHour + 1] >= threshold) {
      endHour += 1;
    }
    const totalDuration = buckets
      .slice(startHour, endHour + 1)
      .reduce((sum, duration) => sum + duration, 0);
    return { startHour, endHour, totalDuration };
  }

  function formatSignedCompactDuration(diffSeconds) {
    const sign = diffSeconds >= 0 ? '+' : '−';
    return `${sign}${formatDurationLocalized(Math.abs(diffSeconds), { compact: true })}`;
  }

  function entertainmentSharePctOf(source) {
    if (!source || !(source.total_duration > 0)) {
      return null;
    }
    const entertainment = (source.category_usage || []).find((item) => item.category === 'entertainment');
    return Math.round(((entertainment?.duration || 0) / source.total_duration) * 100);
  }

  $: peakWindow = stats ? computePeakWindow(stats.hourly_activity_distribution) : null;
  $: peakWindowValue = peakWindow
    ? t('overview.peakHoursValue', { from: peakWindow.startHour, to: peakWindow.endHour + 1 })
    : '--';
  $: peakWindowClockLabel = peakWindow
    ? `${String(peakWindow.startHour).padStart(2, '0')}:00–${String(peakWindow.endHour + 1).padStart(2, '0')}:00`
    : '';
  $: peakWindowSubtitle = peakWindow
    ? t('overview.peakWindowDuration', { dur: formatDurationLocalized(peakWindow.totalDuration, { compact: true }) })
    : null;

  // ── KPI 参照系（today 模式且基线可用时才显示 delta） ──
  $: totalDeltaSubtitle = overviewMode === 'today' && stats && lastWeekStats
    ? t('overview.deltaVsLastWeek', {
        delta: formatSignedCompactDuration(stats.total_duration - lastWeekStats.total_duration),
      })
    : null;
  $: workShareSubtitle = stats && stats.total_duration > 0
    ? `${t('overview.workShare', {
        percent: Math.round(((stats.work_time_duration || 0) / stats.total_duration) * 100),
      })}${stats.overtime_duration > 0 ? ` · ${t('overview.overtimeBadge', { dur: formatDurationLocalized(stats.overtime_duration) })}` : ''}`
    : null;
  // 娱乐占比 = 构成聚合里 key == 'entertainment' 的时长 / 总投入
  $: entertainmentSharePct = stats && stats.total_duration > 0
    ? Math.round(((compositionTotals.entertainment || 0) / stats.total_duration) * 100)
    : null;
  $: entertainmentShareValueText = entertainmentSharePct == null ? '--' : `${entertainmentSharePct}%`;
  $: entertainmentDeltaSubtitle = (() => {
    if (overviewMode !== 'today' || entertainmentSharePct == null) {
      return null;
    }
    // 基线只有 category_usage 可用，同口径取 entertainment / total
    const baselinePct = entertainmentSharePctOf(lastWeekStats);
    if (baselinePct == null) {
      return null;
    }
    const diff = entertainmentSharePct - baselinePct;
    return t('overview.deltaVsLastWeek', { delta: `${diff >= 0 ? '+' : '−'}${Math.abs(diff)}%` });
  })();

  $: eyeCareProgressPercent = Math.max(0, Math.min(100, Math.round(($eyeCareStore?.progress || 0) * 100)));
  $: eyeCareProgressDashOffset = 100 - eyeCareProgressPercent;
  $: eyeCarePhase = $eyeCareStore?.phase || 'WORKING';
  $: eyeCareIsResting = eyeCarePhase === 'RESTING';
  $: eyeCareIsWaitingReturn = eyeCarePhase === 'WAITING_RETURN';
  $: eyeCareIsPaused = Boolean($eyeCareStore?.paused);
  $: eyeCareCanTogglePause = Boolean($eyeCareStore?.enabled) && !eyeCareIsResting && !eyeCareIsWaitingReturn;
  $: eyeCareSummaryTitle = eyeCareIsResting
    ? t('overview.eyeCareResting')
    : eyeCareIsWaitingReturn
      ? t('overview.eyeCareWaitingReturn')
      : eyeCareIsPaused
        ? t('overview.eyeCarePaused')
        : t('overview.eyeCareBreakIn', { duration: formatDurationLocalized($eyeCareStore?.remainingSeconds || 0, { compact: true }) });
  $: eyeCareSummarySubtitle = eyeCareIsResting
    ? t('overview.eyeCareRestRemaining', { duration: formatDurationLocalized($eyeCareStore?.remainingSeconds || 0, { compact: true }) })
    : eyeCareIsWaitingReturn
      ? t('overview.eyeCareWaitingReturnHint')
      : eyeCareIsPaused
        ? t('overview.eyeCarePausedHint')
        : t('overview.eyeCareCycleProgress', {
            elapsed: formatDurationLocalized($eyeCareStore?.elapsedSeconds || 0, { compact: true }),
            total: formatDurationLocalized(($eyeCareStore?.elapsedSeconds || 0) + ($eyeCareStore?.remainingSeconds || 0), { compact: true }),
          });
  $: eyeCareToggleLabel = eyeCareIsPaused ? t('overview.eyeCareResume') : t('overview.eyeCarePause');

  async function toggleEyeCarePause() {
    if (!eyeCareCanTogglePause || togglingEyeCarePause) return;
    togglingEyeCarePause = true;
    try {
      const config = await invoke('get_config');
      const nextPaused = !eyeCareIsPaused;
      config.eye_care_paused = nextPaused;
      await invoke('save_config', { config });
      cache.setConfig(config);
      eyeCareStore.set({ ...$eyeCareStore, paused: nextPaused });
    } catch (toggleError) {
      showToast(formatUserError(toggleError, t('overview.eyeCareToggleFailed')), 'error');
    } finally {
      togglingEyeCarePause = false;
    }
  }

  // ── 洞察条（仅 today 模式、数据非空、基线可用时组句） ──
  $: insightSentence = (() => {
    if (overviewMode !== 'today' || !stats || !(stats.total_duration > 0) || !peakWindow || !lastWeekStats) {
      return null;
    }
    const diff = stats.total_duration - lastWeekStats.total_duration;
    const deltaText = formatDurationLocalized(Math.abs(diff));
    if (diff < 0) {
      return t('overview.insightSentenceLess', { peak: peakWindowClockLabel, delta: deltaText });
    }
    const topCategory = compositionSegments[0];
    if (!topCategory) {
      return null;
    }
    return t('overview.insightSentence', {
      peak: peakWindowClockLabel,
      delta: deltaText,
      category: topCategory.name,
    });
  })();

  // ── 节奏主视觉卡标题（today/week/date 三态） ──
  $: rhythmCardTitle = overviewMode === 'week'
    ? t('overview.typicalDayTitle')
    : overviewMode === 'date'
      ? t('overview.rhythmRangeTitle')
      : t('overview.todayRhythm');

  // ── 按天投入（week/date 模式） ──
  function formatDailyBarDayLabel(dateValue, totalDays) {
    const parsed = parseDateString(dateValue);
    return totalDays <= 7
      ? formatLocalizedDate(parsed, { weekday: 'short' })
      : formatLocalizedDate(parsed, { day: 'numeric' });
  }
  $: maxRangeDailyTotal = rangeDailyTotals.reduce((max, day) => Math.max(max, day.total_duration || 0), 0);
  $: heaviestDailyEntry = maxRangeDailyTotal > 0
    ? rangeDailyTotals.find((day) => day.total_duration === maxRangeDailyTotal)
    : null;
  $: dailyBars = rangeDailyTotals.map((day) => ({
    date: day.date,
    total: day.total_duration || 0,
    label: formatDailyBarDayLabel(day.date, rangeDailyTotals.length),
    isToday: day.date === getLocalDateString(),
    isHeaviest: !!heaviestDailyEntry && day.date === heaviestDailyEntry.date,
    heightPx: maxRangeDailyTotal > 0 && day.total_duration > 0
      ? Math.round(((day.total_duration || 0) / maxRangeDailyTotal) * 110) + 4
      : 3,
  }));

  // ── 常驻网站：首页只带前 6 条，展开时按需请求完整轻量摘要。 ──
  $: domainUsageItems = stats?.domain_usage || [];
  $: topDomains = domainUsageExpanded && expandedDomainUsageItems.length > 0
    ? expandedDomainUsageItems
    : domainUsageItems.slice(0, 6);
  $: topDomainPresentations = topDomains.map((domain) => ({
    ...domain,
    presentation: buildDomainPresentation(domain, stats?.browser_usage || []),
  }));
  $: domainBrowsersLabel = (stats?.browser_usage || [])
    .map((browser) => browser.browser_name)
    .filter(Boolean)
    .join(', ');
  let overviewViewModeReady = false;
  
  let expandedDomains = new Set();
  let editingDomainKey = null;
  let editingSemanticCategory = '';
  let pendingDomainSemanticRequests = new Map();
  let nextDomainSemanticRequestId = 0;
  let domainSemanticEditSessionId = 0;
  let semanticCategoryPopover;
  let semanticPopoverStyle = '';
  const domainSemanticTriggers = new Map();

  // 语义分类（新建 + 删除 + 重命名）
  let showCreateSemanticCategory = false;
  let newSemanticCategoryName = '';
  let semanticCategorySaving = false;
  let pendingDeleteSemanticCategory = null; // { key, name, domainKey, editingCategory }
  let pendingDomainSemanticChange = null; // { domain, domainKey, nextCategory, categoryName, editSessionId }

  // 重命名语义分类
  let showRenameSemanticCategory = false;
  let renameSemanticKey = '';
  let renameSemanticName = '';

  function startRenameSemanticCategory(cat) {
    renameSemanticKey = cat.key;
    renameSemanticName = cat.name;
    showCreateSemanticCategory = false;
    showRenameSemanticCategory = true;
  }

  async function saveRenameSemanticCategory() {
    const name = renameSemanticName.trim();
    if (!name) return;
    semanticCategorySaving = true;
    try {
      await invoke('save_custom_semantic_category', {
        key: renameSemanticKey,
        name,
      });
      await semanticCategoryStore.refresh();
      showRenameSemanticCategory = false;
      showToast(t('overview.semanticCategoryRenamed'), 'success');
    } catch (e) {
      showToast(e.toString(), 'error');
    } finally {
      semanticCategorySaving = false;
    }
  }

  function restoreDomainSemanticPopover(domainKey, categoryKey) {
    if (!domainOverlayOpen || selectedDomainDetail?.domain !== domainKey) return;
    editingDomainKey = domainKey;
    editingSemanticCategory = categoryKey;
    tick().then(async () => {
      updateSemanticPopoverPosition();
      await tick();
      semanticCategoryPopover?.focus();
    });
  }

  function requestDeleteSemanticCategory(cat, domain) {
    if (!cat || !domain || semanticCategorySaving) return;
    const domainKey = domain.domain;
    domainSemanticTriggers.get(domainKey)?.focus();
    semanticPopoverStyle = '';
    editingDomainKey = null;
    pendingDeleteSemanticCategory = {
      key: cat.key,
      name: getSemanticCategoryDisplayName(cat),
      domainKey,
      editingCategory: editingSemanticCategory,
    };
  }

  function cancelDeleteSemanticCategory() {
    if (semanticCategorySaving) return;
    const action = pendingDeleteSemanticCategory;
    pendingDeleteSemanticCategory = null;
    if (action) restoreDomainSemanticPopover(action.domainKey, action.editingCategory);
  }

  async function confirmDeleteSemanticCategory() {
    if (!pendingDeleteSemanticCategory || semanticCategorySaving) return;
    const { key, name } = pendingDeleteSemanticCategory;
    semanticCategorySaving = true;
    try {
      const affected = await invoke('delete_custom_semantic_category', { key });
      await semanticCategoryStore.refresh();
      pendingDeleteSemanticCategory = null;
      showToast(
        t('overview.semanticCategoryDeleted', { category: name, count: affected }),
        'success'
      );
    } catch (e) {
      showToast(e.toString(), 'error');
    } finally {
      semanticCategorySaving = false;
    }
  }

  async function createCustomSemanticCategory() {
    const name = newSemanticCategoryName.trim();
    if (!name) {
      showToast(t('overview.semanticCategoryNameRequired'), 'error');
      return;
    }
    try {
      let key = name.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
      if (!key || key === '-') {
        let hash = 0;
        for (let i = 0; i < name.length; i++) {
          hash = ((hash << 5) - hash + name.charCodeAt(i)) | 0;
        }
        key = 'scat-' + Math.abs(hash).toString(36);
      }
      await invoke('save_custom_semantic_category', { key, name });
      await semanticCategoryStore.refresh();
      showCreateSemanticCategory = false;
      newSemanticCategoryName = '';
      showToast(t('overview.semanticCategoryCreated'), 'success');
    } catch (e) {
      showToast(e.toString(), 'error');
    }
  }

  function getSemanticCategoryDisplayName(cat) {
    const translatedSemanticCategoryName = translateSemanticCategoryLabel(cat.key);
    const isKnownSemanticCategory = cat.is_system || translatedSemanticCategoryName !== cat.key;
    return isKnownSemanticCategory ? translatedSemanticCategoryName : (cat.name || translatedSemanticCategoryName);
  }
  
  // 域名摘要 / 单域名详情浮层
  let domainOverlayOpen = false;
  let domainOverlayView = 'detail';
  let domainCollection = [];
  let domainCollectionTotalCount = 0;
  let selectedDomainDetail = null;
  let domainOverlayLoading = false;
  let domainOverlayError = null;
  let domainOverlayRequestId = 0;
  let domainOverlayDialog;
  let domainOverlayBackButton;
  $: currentLocale = $locale;
  $: isSingleSelectedDate = selectedDateFrom === selectedDateTo;
  $: canStepOverviewDateForward = selectedDateTo < getLocalDateString();
  $: overviewSubtitle = overviewMode === 'date'
    ? getDateRangeLabel(selectedDateFrom, selectedDateTo)
    : overviewMode === 'week'
      ? `${t('overview.modeWeek')} · ${getWeekRangeLabel(getLocalDateString())}`
      : formatLocalizedDate(new Date(), { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' });
  $: overviewStatusLabel = overviewMode === 'today' ? t('overview.live') : t(`overview.${overviewMode === 'date' ? 'modeDate' : 'modeWeek'}`);
  $: overviewIsLive = overviewMode !== 'date';
  // 圆点绿+脉冲还需要"正在录制"：停止记录后即便在"今天"模式，圆点也应灰掉（issue #131）
  $: recordingState = $recordingStore;
  $: overviewDotActive = overviewIsLive && isActiveRecording(recordingState);
  $: overviewTotalActivityTitle = overviewMode === 'week'
    ? t('overview.totalActivityWeek')
    : overviewMode === 'date'
      ? t(isSingleSelectedDate ? 'overview.totalActivityDate' : 'overview.totalActivityRange')
      : t('overview.totalActivityToday');
  $: overviewWorkDurationTitle = overviewMode === 'week'
    ? t('overview.workDurationWeek')
    : overviewMode === 'date'
      ? t(isSingleSelectedDate ? 'overview.workDurationDate' : 'overview.workDurationRange')
      : t('overview.workDurationToday');
  $: appUsageViewModeLabel = appUsageViewMode === 'column' ? t('overview.appUsageColumn') : t('overview.appUsageBar');
  $: hourlyChartPeakHourLabel = overviewMode === 'week'
    ? t('hourlyChart.peakHourRange')
    : overviewMode === 'date'
      ? t(isSingleSelectedDate ? 'hourlyChart.peakHour' : 'hourlyChart.peakHourRange')
      : t('hourlyChart.peakHour');
  $: hourlyChartPeakDurationLabel = overviewMode === 'week'
    ? t('hourlyChart.peakDurationRange')
    : overviewMode === 'date'
      ? t(isSingleSelectedDate ? 'hourlyChart.peakDuration' : 'hourlyChart.peakDurationRange')
      : t('hourlyChart.peakDuration');
  $: hourlyChartDistributionTitle = overviewMode === 'week'
    ? t('hourlyChart.distributionTitleWeek')
    : overviewMode === 'date'
      ? t(isSingleSelectedDate ? 'hourlyChart.distributionTitleDate' : 'hourlyChart.distributionTitleRange')
      : t('hourlyChart.distributionTitleToday');
  $: hourlyChartDistributionSubtitleKey = overviewMode === 'week'
    ? 'hourlyChart.distributionSubtitleRange'
    : overviewMode === 'date'
      ? (isSingleSelectedDate ? 'hourlyChart.distributionSubtitle' : 'hourlyChart.distributionSubtitleRange')
      : 'hourlyChart.distributionSubtitle';
  $: overviewNoWebsiteVisitsText = overviewMode === 'week'
    ? t('overview.noWebsiteVisitsWeek')
    : overviewMode === 'date'
      ? t(isSingleSelectedDate ? 'overview.noWebsiteVisitsDate' : 'overview.noWebsiteVisitsRange')
      : t('overview.noWebsiteVisitsToday');
  $: overviewNoAppStatsText = overviewMode === 'week'
    ? t('overview.noAppStatsWeek')
    : overviewMode === 'date'
      ? t(isSingleSelectedDate ? 'overview.noAppStatsDate' : 'overview.noAppStatsRange')
      : t('overview.noAppStatsToday');

  function readStoredOverviewViewMode(key, fallback) {
    try {
      const value = window.localStorage.getItem(key);
      return value || fallback;
    } catch {
      return fallback;
    }
  }

  function persistOverviewViewMode(key, value) {
    try {
      window.localStorage.setItem(key, value);
    } catch {
      // ignore persistence errors
    }
  }

  // 响应式图标加载：stats 变化时自动触发
  $: if (stats) {
    if (stats.app_usage?.length) {
      preloadAppIcons(stats.app_usage.slice(0, 10).map(a => ({
        appName: a.app_name,
        executablePath: a.executable_path,
      })), invoke);
    }
  }

  function formatDuration(seconds) {
    return formatDurationLocalized(seconds);
  }

  const UNRESOLVED_BROWSER_DOMAIN_LABEL = '未识别页面';

  function isUnresolvedBrowserDomain(domain) {
    return domain?.domain === UNRESOLVED_BROWSER_DOMAIN_LABEL;
  }

  function getBrowserDomainDisplayLabel(domain) {
    return isUnresolvedBrowserDomain(domain) ? t('overview.unresolvedPage') : domain.domain;
  }

  function getDomainSemanticLabel(domain) {
    if (!domain?.semantic_category?.trim()) return t('overview.autoDetected');
    return semanticCategoryStore.getSemanticCategoryDisplayName(domain.semantic_category.trim());
  }

  function registerDomainSemanticTrigger(node, domainKey) {
    let currentDomainKey = domainKey;
    if (currentDomainKey) domainSemanticTriggers.set(currentDomainKey, node);

    return {
      update(nextDomainKey) {
        if (currentDomainKey && domainSemanticTriggers.get(currentDomainKey) === node) {
          domainSemanticTriggers.delete(currentDomainKey);
        }
        currentDomainKey = nextDomainKey;
        if (currentDomainKey) domainSemanticTriggers.set(currentDomainKey, node);
      },
      destroy() {
        if (currentDomainKey && domainSemanticTriggers.get(currentDomainKey) === node) {
          domainSemanticTriggers.delete(currentDomainKey);
        }
      },
    };
  }

  function updateSemanticPopoverPosition() {
    const trigger = domainSemanticTriggers.get(editingDomainKey);
    if (!editingDomainKey || !trigger || typeof window === 'undefined') {
      semanticPopoverStyle = '';
      return;
    }

    const position = getViewportPopoverPlacement(trigger.getBoundingClientRect(), {
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      preferredWidth: 352,
    });
    const verticalStyle = position.top === null
      ? `top: auto; bottom: ${position.bottom}px;`
      : `top: ${position.top}px; bottom: auto;`;
    semanticPopoverStyle = `left: ${position.left}px; width: ${position.width}px; max-height: ${position.maxHeight}px; ${verticalStyle}`;
  }

  function handleSemanticPopoverViewportChange() {
    if (editingDomainKey) updateSemanticPopoverPosition();
  }

  async function startDomainSemanticEdit(domain) {
    domainSemanticEditSessionId += 1;
    editingDomainKey = domain.domain;
    editingSemanticCategory = domain.semantic_category?.trim() || '';
    showCreateSemanticCategory = false;
    newSemanticCategoryName = '';
    showRenameSemanticCategory = false;
    renameSemanticKey = '';
    renameSemanticName = '';
    await tick();
    updateSemanticPopoverPosition();
    await tick();
    semanticCategoryPopover?.focus();
  }

  function getSemanticCategoryOptions() {
    const options = [...$semanticCategoryStore];
    if (
      editingSemanticCategory &&
      !options.some((category) => category.key === editingSemanticCategory)
    ) {
      return [{
        key: editingSemanticCategory,
        name: semanticCategoryStore.getSemanticCategoryDisplayName(editingSemanticCategory),
        is_system: true,
      }, ...options];
    }
    return options;
  }

  function isDomainSemanticSavePending(domainKey) {
    return pendingDomainSemanticRequests.has(domainKey);
  }

  function setDomainSemanticSavePending(domainKey, requestId) {
    pendingDomainSemanticRequests = new Map(pendingDomainSemanticRequests);
    pendingDomainSemanticRequests.set(domainKey, requestId);
  }

  function clearDomainSemanticSavePending(domainKey, requestId) {
    if (pendingDomainSemanticRequests.get(domainKey) !== requestId) return;
    pendingDomainSemanticRequests = new Map(pendingDomainSemanticRequests);
    pendingDomainSemanticRequests.delete(domainKey);
  }

  function isCurrentDomainSemanticEdit(domainKey, editSessionId) {
    return domainSemanticEditSessionId === editSessionId
      && (
        editingDomainKey === domainKey
        || pendingDomainSemanticChange?.domainKey === domainKey
      )
      && domainOverlayOpen
      && selectedDomainDetail?.domain === domainKey;
  }

  function isCurrentDomainSemanticSave(domainKey, requestId, editSessionId) {
    return pendingDomainSemanticRequests.get(domainKey) === requestId
      && isCurrentDomainSemanticEdit(domainKey, editSessionId);
  }

  function cancelDomainSemanticEdit({ restoreFocus = true } = {}) {
    const domainKey = editingDomainKey
      || pendingDomainSemanticChange?.domainKey
      || pendingDeleteSemanticCategory?.domainKey;
    domainSemanticEditSessionId += 1;
    editingDomainKey = null;
    editingSemanticCategory = '';
    semanticPopoverStyle = '';
    showCreateSemanticCategory = false;
    newSemanticCategoryName = '';
    showRenameSemanticCategory = false;
    renameSemanticKey = '';
    renameSemanticName = '';
    pendingDomainSemanticChange = null;
    pendingDeleteSemanticCategory = null;
    if (!restoreFocus) return;
    tick().then(() => domainSemanticTriggers.get(domainKey)?.focus());
  }

  function cancelDomainSemanticChange() {
    if (!pendingDomainSemanticChange) return;
    const action = pendingDomainSemanticChange;
    if (isDomainSemanticSavePending(action.domainKey)) return;
    pendingDomainSemanticChange = null;
    restoreDomainSemanticPopover(action.domainKey, action.nextCategory);
  }

  function isOverviewSemanticActionBusy() {
    if (pendingDeleteSemanticCategory) return semanticCategorySaving;
    return Boolean(
      pendingDomainSemanticChange
      && isDomainSemanticSavePending(pendingDomainSemanticChange.domainKey)
    );
  }

  function closeDomainOverlay() {
    domainOverlayRequestId += 1;
    domainOverlayOpen = false;
    domainOverlayView = 'detail';
    domainCollection = [];
    domainCollectionTotalCount = 0;
    selectedDomainDetail = null;
    domainOverlayLoading = false;
    domainOverlayError = null;
    cancelDomainSemanticEdit({ restoreFocus: false });
  }

  function focusDomainOverlayView() {
    tick().then(() => {
      if (!domainOverlayOpen) return;
      const summaryButton = domainOverlayDialog?.querySelector('[data-domain-summary]');
      const target = domainOverlayView === 'all'
        ? (summaryButton || domainOverlayDialog)
        : (domainOverlayBackButton || domainOverlayDialog);
      target?.focus();
    });
  }

  function getOverviewDomainParams(domain = undefined) {
    const range = getHourlyBreakdownRange();
    return {
      ...(domain ? { domain } : {}),
      mode: overviewMode,
      date: range.dateTo,
      dateFrom: range.dateFrom,
      dateTo: range.dateTo,
    };
  }

  async function loadDomainDetail(domainKey) {
    const requestId = ++domainOverlayRequestId;
    domainOverlayOpen = true;
    domainOverlayView = 'detail';
    selectedDomainDetail = null;
    domainOverlayLoading = true;
    domainOverlayError = null;
    focusDomainOverlayView();
    try {
      const detail = await invoke('get_overview_domain_detail', getOverviewDomainParams(domainKey));
      if (requestId !== domainOverlayRequestId || !domainOverlayOpen) return false;
      selectedDomainDetail = detail;
      return true;
    } catch (e) {
      if (requestId !== domainOverlayRequestId || !domainOverlayOpen) return false;
      domainOverlayError = formatUserError(e);
      return false;
    } finally {
      if (requestId === domainOverlayRequestId) domainOverlayLoading = false;
    }
  }

  async function openDomainDetail(domain) {
    if (!domain?.domain) return;
    cancelDomainSemanticEdit({ restoreFocus: false });
    const availableDomains = expandedDomainUsageItems.length > 0
      ? expandedDomainUsageItems
      : domainUsageItems;
    domainCollection = availableDomains.map((item) => ({
      ...item,
      browser_sources: item.browser_sources
        || buildDomainPresentation(item, stats?.browser_usage || []).browserSources,
    }));
    domainCollectionTotalCount = stats?.domain_total_count || availableDomains.length;
    await loadDomainDetail(domain.domain);
  }

  async function toggleDomainUsageExpanded() {
    if (domainUsageExpanded) {
      domainUsageRequestId += 1;
      domainUsageExpanded = false;
      expandedDomainUsageItems = [];
      domainUsageLoading = false;
      return;
    }

    if ((stats?.domain_total_count || domainUsageItems.length) <= domainUsageItems.length) {
      expandedDomainUsageItems = domainUsageItems;
      domainUsageExpanded = true;
      return;
    }

    const requestId = ++domainUsageRequestId;
    domainUsageLoading = true;
    try {
      const collection = await invoke('get_overview_domains', getOverviewDomainParams());
      if (requestId !== domainUsageRequestId) return;
      expandedDomainUsageItems = collection?.domains || [];
      domainUsageExpanded = true;
    } catch (e) {
      if (requestId !== domainUsageRequestId) return;
      showToast(t('overview.domainLoadFailed'), 'error');
    } finally {
      if (requestId === domainUsageRequestId) {
        domainUsageLoading = false;
      }
    }
  }

  function resetDomainUsageExpansion() {
    domainUsageRequestId += 1;
    domainUsageExpanded = false;
    expandedDomainUsageItems = [];
    domainUsageLoading = false;
  }

  async function selectDomainFromCollection(domain) {
    if (!domain?.domain) return;
    cancelDomainSemanticEdit({ restoreFocus: false });
    await loadDomainDetail(domain.domain);
  }

  function showAllDomainSummaries() {
    cancelDomainSemanticEdit({ restoreFocus: false });
    domainOverlayView = 'all';
    selectedDomainDetail = null;
    domainOverlayError = null;
    focusDomainOverlayView();
  }

  async function refreshCurrentDomainDetail(domainKey, isCurrent = () => true) {
    if (!isCurrent()) return false;
    await loadStats(true);
    if (!isCurrent()) return false;
    const detail = await invoke('get_overview_domain_detail', getOverviewDomainParams(domainKey));
    if (!isCurrent()) return false;
    selectedDomainDetail = detail;
    domainCollection = domainCollection.map((domain) =>
      domain.domain === domainKey
        ? { ...domain, semantic_category: detail.semantic_category, duration: detail.duration }
        : domain
    );
    expandedDomainUsageItems = expandedDomainUsageItems.map((domain) =>
      domain.domain === domainKey
        ? { ...domain, semantic_category: detail.semantic_category, duration: detail.duration }
        : domain
    );
    return true;
  }

  function shouldUseOverviewCache() {
    return overviewMode === 'today';
  }

  function shouldAutoRefreshOverview() {
    return overviewMode !== 'date';
  }

  function scheduleOverviewRefresh(forceRefresh = true) {
    if (!shouldAutoRefreshOverview() || document.hidden) {
      return;
    }
    if (refreshDebounceTimer) {
      clearTimeout(refreshDebounceTimer);
    }
    refreshDebounceTimer = setTimeout(() => {
      refreshDebounceTimer = null;
      loadStats(forceRefresh);
    }, OVERVIEW_EVENT_DEBOUNCE_MS);
  }

  function setOverviewMode(mode) {
    if (overviewMode === mode) {
      return;
    }
    overviewMode = mode;
    if (mode === 'date') {
      selectedDateFrom = getLocalDateString();
      selectedDateTo = getLocalDateString();
    }
    clearSelectedCompositionCategory();
    resetDomainUsageExpansion();
    closeDomainOverlay();
    loadStats(true);
  }

  function normalizeSelectedDateRange() {
    if (selectedDateTo < selectedDateFrom) {
      selectedDateTo = selectedDateFrom;
    }
  }

  function handleOverviewDateChange() {
    normalizeSelectedDateRange();
    clearSelectedCompositionCategory();
    resetDomainUsageExpansion();
    closeDomainOverlay();
    loadStats(true);
  }

  function stepOverviewDateRange(offsetDays) {
    clearSelectedCompositionCategory();
    const today = getLocalDateString();
    if (offsetDays > 0 && !canStepOverviewDateForward) {
      return;
    }

    normalizeSelectedDateRange();
    let nextStart = shiftIsoDate(selectedDateFrom, offsetDays);
    let nextEnd = shiftIsoDate(selectedDateTo, offsetDays);

    if (nextEnd > today) {
      const overshootDays = diffIsoDateDays(nextEnd, today);
      nextStart = shiftIsoDate(nextStart, -overshootDays);
      nextEnd = today;
    }

    selectedDateFrom = nextStart;
    selectedDateTo = nextEnd;
    handleOverviewDateChange();
  }

  async function saveDomainSemanticRule(domain, { confirmed = false } = {}) {
    const action = confirmed ? pendingDomainSemanticChange : null;
    const nextCategory = (confirmed ? action?.nextCategory : editingSemanticCategory)?.trim() || '';
    if (!domain) return;
    const domainKey = domain.domain;
    if (!domainKey || !nextCategory || isDomainSemanticSavePending(domainKey)) return;

    const editSessionId = confirmed ? action?.editSessionId : domainSemanticEditSessionId;
    if ((domain.semantic_category?.trim() || '') === nextCategory) {
      cancelDomainSemanticEdit();
      return;
    }

    if (!confirmed) {
      domainSemanticTriggers.get(domainKey)?.focus();
      semanticPopoverStyle = '';
      editingDomainKey = null;
      pendingDomainSemanticChange = {
        domain,
        domainKey,
        nextCategory,
        categoryName: semanticCategoryStore.getSemanticCategoryDisplayName(nextCategory),
        editSessionId,
      };
      return;
    }

    if (
      !action
      || action.domainKey !== domainKey
      || !isCurrentDomainSemanticEdit(domainKey, editSessionId)
      || isDomainSemanticSavePending(domainKey)
    ) return;

    const requestId = ++nextDomainSemanticRequestId;
    setDomainSemanticSavePending(domainKey, requestId);
    const isCurrent = () => isCurrentDomainSemanticSave(domainKey, requestId, editSessionId);

    try {
      const updatedCount = await invoke('set_domain_semantic_rule', {
        domain: domainKey,
        semanticCategory: nextCategory,
        syncHistory: true,
      });

      const refreshed = await refreshCurrentDomainDetail(domainKey, isCurrent);
      if (!refreshed) return;
      cancelDomainSemanticEdit();
      showToast(
        t('overview.domainSemanticUpdated', {
          domain: domainKey,
          category: semanticCategoryStore.getSemanticCategoryDisplayName(nextCategory),
          count: updatedCount,
        }),
        'success'
      );
    } catch (e) {
      if (!isCurrent()) return;
      console.error('修改网站语义分类失败:', e);
      showToast(
        t('overview.domainSemanticUpdateFailed', {
          domain: domainKey,
          error: e,
        }),
        'error'
      );
    } finally {
      clearDomainSemanticSavePending(domainKey, requestId);
    }
  }

  function confirmDomainSemanticRule() {
    if (!pendingDomainSemanticChange) return;
    void saveDomainSemanticRule(pendingDomainSemanticChange.domain, { confirmed: true });
  }

  async function refreshOverviewStats({ silent = false } = {}) {
    const params = {
      mode: overviewMode,
      dateFrom: overviewMode === 'date' ? selectedDateFrom : undefined,
      dateTo: overviewMode === 'date' ? selectedDateTo : undefined,
    };
    const paramsKey = `${params.mode}|${params.dateFrom || ''}|${params.dateTo || ''}`;
    // 仅当在途请求与当前模式/日期完全一致时才复用，避免切换模式后拿到旧模式数据
    if (overviewRefreshPromise && overviewRefreshKey === paramsKey) {
      return overviewRefreshPromise;
    }

    const requestId = ++overviewRequestId;
    overviewRefreshKey = paramsKey;
    overviewRefreshPromise = invoke('get_overview_stats', params)
      .then((newStats) => {
        if (requestId !== overviewRequestId) {
          return;
        }
        stats = newStats;
        if (shouldUseOverviewCache()) {
          cache.setOverview(newStats);
        }
        error = null;
      })
      .catch((e) => {
        if (requestId !== overviewRequestId) {
          return;
        }
        if (silent) {
          console.warn('后台刷新失败:', e);
          return;
        }
        error = formatUserError(e, t('common.loadFailedRetry'));
      })
      .finally(() => {
        if (requestId === overviewRequestId) {
          overviewRefreshPromise = null;
          loading = false;
        }
      });

    return overviewRefreshPromise;
  }

  async function loadStats(forceRefresh = false) {
    // today 模式并行补齐「上周同日」基线（有同日期基线时为空操作）
    ensureLastWeekBaseline();
    if (!shouldUseOverviewCache()) {
      stats = null;
      loading = true;
      error = null;
      await refreshOverviewStats();
      return;
    }

    // 乐观更新策略：先显示缓存数据，后台刷新后再更新
    let cacheData;
    const unsubscribe = cache.subscribe(c => { cacheData = c; });
    unsubscribe();
    
    // 如果有缓存数据，立即显示（不显示 loading）
    if (cacheData.overview.data) {
      stats = cacheData.overview.data;
      loading = false;
      
      // 如果缓存有效且非强制刷新，直接返回
      if (!forceRefresh && cache.isValid(cacheData, 'overview')) {
        return;
      }

      await refreshOverviewStats({ silent: true });
    } else {
      // 首次加载，显示 loading
      loading = true;
      error = null;
      await refreshOverviewStats();
    }
  }

  onMount(async () => {
    semanticCategoryStore.refresh();
    appUsageViewMode = readStoredOverviewViewMode(APP_USAGE_VIEW_MODE_KEY, 'row');
    overviewViewModeReady = true;
    try { categoryList = await invoke('get_categories'); } catch (e) { categoryList = []; }
    try { const cfg = await invoke('get_config'); workGoalMinutes = cfg.daily_work_goal_minutes ?? null; } catch (e) {}
    loadHourlyBreakdown();
    loadStats();
    if (!document.hidden) {
      clockInterval = setInterval(() => {
        // 界面只展示到分钟：仅分钟变化时才更新状态，避免每秒触发整页响应式重算
        const now = new Date();
        if (now.getMinutes() !== currentTime.getMinutes() || now.getHours() !== currentTime.getHours()) {
          currentTime = now;
        }
        if (!shouldAutoRefreshOverview()) {
          return;
        }
        // 跨天检测
        const newDate = now.getDate();
        if (newDate !== lastCheckDate) {
          lastCheckDate = newDate;
          loadStats(true);
        }
      }, 1000);
      refreshInterval = setInterval(() => {
        if (shouldAutoRefreshOverview()) {
          loadStats();
        }
      }, OVERVIEW_FALLBACK_REFRESH_MS);
    }

    handleVisibilityChange = () => {
      if (document.hidden) {
        clearInterval(clockInterval);
        clearInterval(refreshInterval);
        if (refreshDebounceTimer) clearTimeout(refreshDebounceTimer);
        clockInterval = null;
        refreshInterval = null;
        refreshDebounceTimer = null;
      } else {
        currentTime = new Date();
        lastCheckDate = currentTime.getDate();
        clockInterval = setInterval(() => {
          const now = new Date();
          if (now.getMinutes() !== currentTime.getMinutes() || now.getHours() !== currentTime.getHours()) {
            currentTime = now;
          }
          if (!shouldAutoRefreshOverview()) {
            return;
          }
          const newDate = now.getDate();
          if (newDate !== lastCheckDate) {
            lastCheckDate = newDate;
            loadStats(true);
          }
        }, 1000);
        refreshInterval = setInterval(() => {
          if (shouldAutoRefreshOverview()) {
            loadStats();
          }
        }, OVERVIEW_FALLBACK_REFRESH_MS);
        loadStats(true);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // 监听全局 activity-added 事件（实时同步）
    handleActivityAdded = () => {
      scheduleOverviewRefresh(true);
    };
    window.addEventListener('activity-added', handleActivityAdded);
  });

  $: if (overviewViewModeReady) {
    persistOverviewViewMode(APP_USAGE_VIEW_MODE_KEY, appUsageViewMode);
  }

  onDestroy(() => {
    hourlyBreakdownRequestId += 1;
    if (clockInterval) clearInterval(clockInterval);
    if (refreshInterval) clearInterval(refreshInterval);
    if (refreshDebounceTimer) clearTimeout(refreshDebounceTimer);
    if (handleActivityAdded) window.removeEventListener('activity-added', handleActivityAdded);
    if (handleVisibilityChange) document.removeEventListener('visibilitychange', handleVisibilityChange);
  });
</script>

<svelte:window
  on:resize={handleSemanticPopoverViewportChange}
  on:keydown={(e) => {
    if (e.key !== 'Escape') return;
    // 弹窗 Escape 统一在 window 层处理（遮罩不再依赖自身聚焦才能响应）
    if (pendingDeleteSemanticCategory) {
      cancelDeleteSemanticCategory();
    } else if (pendingDomainSemanticChange) {
      cancelDomainSemanticChange();
    } else if (editingDomainKey) {
      cancelDomainSemanticEdit();
    } else if (domainOverlayOpen) {
      closeDomainOverlay();
    }
  }}
/>

<div class="page-shell overview-page-shell" data-locale={currentLocale}>
  <!-- 页面标题 -->
  <div class="page-header">
    <div class="page-title-group">
      <div class="page-title-badge">
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M4 6.5A2.5 2.5 0 016.5 4H10v6H4V6.5Zm10 0A2.5 2.5 0 0116.5 4H20v6h-6V4Zm-10 11A2.5 2.5 0 016.5 15H10v5H6.5A2.5 2.5 0 014 17.5V15Zm10-2.5H20v2.5A2.5 2.5 0 0117.5 20H14v-5Z" />
        </svg>
      </div>
      <div class="page-title-copy">
        <h2>{t('overview.title')}</h2>
        <p>
        {overviewSubtitle}
        {#if overviewMode === 'today'}
          <span class="ml-1.5 font-mono text-xs">{formatLocalizedTime(currentTime, { hour: '2-digit', minute: '2-digit' })}</span>
        {/if}
        <!-- #131 录制状态点：改版后状态胶囊并入日期行，仍随录制状态灰/绿 -->
        <span
          class="ms-1.5 inline-block h-1.5 w-1.5 rounded-full align-middle {overviewDotActive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400 dark:bg-[rgba(255,255,255,0.14)]'}"
          title={overviewStatusLabel}
        ></span>
        </p>
      </div>
    </div>
    <!-- 改版：原 overview-lead-card 模式切换整卡删除，分段切换（今天/本周/自定义）并入页头右侧一行 -->
    <div class="overview-command-deck">
      <button
        type="button"
        class="page-control-btn {overviewMode === 'today' ? 'page-control-btn-active' : ''}"
        on:click={() => setOverviewMode('today')}
      >
        {t('overview.modeToday')}
      </button>
      <button
        type="button"
        class="page-control-btn {overviewMode === 'week' ? 'page-control-btn-active' : ''}"
        on:click={() => setOverviewMode('week')}
      >
        {t('overview.modeWeek')}
      </button>
      <button
        type="button"
        class="page-control-btn {overviewMode === 'date' ? 'page-control-btn-active' : ''}"
        on:click={() => setOverviewMode('date')}
      >
        {t('overview.modeDate')}
      </button>

      {#if overviewMode === 'date'}
        <div class="overview-date-bar">
          <button
            type="button"
            class="page-control-btn-icon"
            title={t('common.previous')}
            on:click={() => stepOverviewDateRange(-1)}
          >
            <svg class="h-4 w-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          <LocalizedDatePicker
            mode="range"
            bind:startDate={selectedDateFrom}
            bind:endDate={selectedDateTo}
            localeCode={currentLocale}
            max={getLocalDateString()}
            triggerClass="overview-date-trigger"
            on:change={handleOverviewDateChange}
          />

          <button
            type="button"
            class="page-control-btn-icon"
            title={t('common.next')}
            disabled={!canStepOverviewDateForward}
            on:click={() => stepOverviewDateRange(1)}
          >
            <svg class="h-4 w-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      {/if}
    </div>
  </div>

  <div class="overview-editorial-shell">
  <!-- 洞察条：仅 today 模式、数据非空且上周同日基线可用时组句显示 -->
  {#if overviewMode === 'today' && insightSentence}
    <!-- 窄屏精修：flex-wrap 允许洞察句换行,链接自动下移到第二行,避免最小窗口横向溢出 -->
    <div class="overview-insight-strip mb-4 flex flex-wrap items-center gap-3.5 rounded-[20px] border border-blue-100 bg-gradient-to-r from-blue-50 via-white to-white px-5 py-3.5 dark:border-blue-900/40 dark:from-blue-950/35 dark:via-[#1c1c1e] dark:to-[#1c1c1e]">
      <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-500 dark:bg-blue-900/40 dark:text-blue-300">
        <svg class="h-[17px] w-[17px]" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M12 2.5l2 6.4 6.5 2.1-6.5 2.1-2 6.4-2-6.4L3.5 11l6.5-2.1zM19 15.5l.9 2.6 2.6.9-2.6.9-.9 2.6-.9-2.6-2.6-.9 2.6-.9z" />
        </svg>
      </span>
      <p class="overview-insight-copy min-w-0 flex-1 basis-52 text-sm text-slate-600 dark:text-[#98989d]">{insightSentence}</p>
      {#if $eyeCareStore?.enabled}
        <div class="overview-eye-care-summary" class:overview-eye-care-summary-paused={eyeCareIsPaused} class:overview-eye-care-summary-resting={eyeCareIsResting || eyeCareIsWaitingReturn}>
          <div
            class="overview-eye-care-progress"
            role="progressbar"
            aria-label={t('overview.eyeCareProgress')}
            aria-valuemin="0"
            aria-valuemax="100"
            aria-valuenow={eyeCareProgressPercent}
          >
            <svg viewBox="0 0 36 36" aria-hidden="true">
              <circle class="overview-eye-care-progress-track" cx="18" cy="18" r="15.9" pathLength="100" />
              <circle class="overview-eye-care-progress-value" cx="18" cy="18" r="15.9" pathLength="100" stroke-dasharray="100" stroke-dashoffset={eyeCareProgressDashOffset} />
            </svg>
            <strong>{eyeCareProgressPercent}%</strong>
          </div>
          <a class="overview-eye-care-copy" href="#/eye-care" aria-label={t('overview.eyeCareOpen')}>
            <strong>{eyeCareSummaryTitle}</strong>
            <span>{eyeCareSummarySubtitle}</span>
          </a>
          {#if eyeCareCanTogglePause}
            <button
              type="button"
              class="overview-eye-care-toggle"
              class:overview-eye-care-toggle-paused={eyeCareIsPaused}
              aria-label={eyeCareToggleLabel}
              title={eyeCareToggleLabel}
              disabled={togglingEyeCarePause}
              on:click={toggleEyeCarePause}
            >
              {#if togglingEyeCarePause}
                <span class="overview-eye-care-spinner" aria-hidden="true"></span>
              {:else if eyeCareIsPaused}
                <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5.5v13l10-6.5z" /></svg>
              {:else}
                <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z" /></svg>
              {/if}
            </button>
          {/if}
        </div>
      {:else}
        <a
          href="#/report"
          class="shrink-0 whitespace-nowrap text-sm font-semibold text-primary-600 transition-colors hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
        >
          {t('overview.insightWeekLink')}
        </a>
      {/if}
    </div>
  {/if}

  <div class="overview-summary-grid mb-4">
    {#if loading || !stats}
      {#each [1,2,3,4] as _}
        <div class="min-h-[116px] rounded-2xl border border-slate-100 bg-white p-5 animate-pulse dark:border-[var(--surface-border-default)]/60 dark:bg-[#2c2c2e]/80">
          <div class="flex h-full items-center justify-between gap-4">
            <div class="flex-1">
              <div class="h-3 rounded bg-slate-200 dark:bg-[var(--editorial-surface-subtle)] w-20"></div>
              <div class="mt-6 h-8 w-1/2 rounded bg-slate-200 dark:bg-[var(--editorial-surface-subtle)]"></div>
            </div>
            <div class="h-11 w-11 rounded-2xl bg-slate-100 dark:bg-[var(--editorial-surface-subtle)] shrink-0"></div>
          </div>
        </div>
      {/each}
    {:else}
      <!-- 改版 KPI：总投入 / 工作时长 / 专注峰值 / 娱乐占比（原浏览器时长、应用数两卡移除） -->
      <StatsCard
        compact
        title={overviewTotalActivityTitle}
        value={formatDurationLocalized(stats.total_duration, { compact: true })}
        icon="duration"
        color="indigo"
        subtitle={totalDeltaSubtitle}
      />
      <StatsCard
        compact
        title={overviewWorkDurationTitle}
        value={formatDurationLocalized(stats.work_time_duration || 0, { compact: true })}
        icon="focus"
        color="emerald"
        subtitle={workShareSubtitle}
      />
      <StatsCard
        compact
        title={t('overview.peakFocus')}
        value={peakWindowValue}
        icon="duration"
        color="blue"
        subtitle={peakWindowSubtitle}
      />
      <StatsCard
        compact
        title={t('overview.entertainmentShare')}
        value={entertainmentShareValueText}
        icon="apps"
        color="rose"
        subtitle={entertainmentDeltaSubtitle}
      />
    {/if}
  </div>

  {#if error}
    <div class="page-banner-error mb-4">
      <div>
        <p class="font-semibold">{t('overview.loadError')}</p>
        <p class="text-sm mt-1">{error}</p>
      </div>
      <button class="page-action-brand" on:click={loadStats}>{t('overview.retry')}</button>
    </div>
  {/if}

  <!-- week/date 模式：「按天投入」卡（置于节奏卡上方；today 模式不显示） -->
  {#if overviewMode !== 'today'}
    <div class="page-card overview-panel overview-panel-subtle mb-4">
      <div class="mb-3 flex items-baseline justify-between gap-3">
        <h3 class="page-section-title !mb-0">{t('overview.dailyInvest')}</h3>
        {#if heaviestDailyEntry}
          <span class="text-xs text-slate-400 dark:text-[#636c76]">
            {t('overview.heaviestDay', {
              day: formatDailyBarDayLabel(heaviestDailyEntry.date, rangeDailyTotals.length),
              dur: formatDurationLocalized(heaviestDailyEntry.total_duration, { compact: true }),
            })}
          </span>
        {/if}
      </div>
      {#if rangeDailyLoading && rangeDailyTotals.length === 0}
        <div class="flex h-[150px] items-end gap-2 px-1 animate-pulse">
          {#each [1, 2, 3, 4, 5, 6, 7] as pulseIndex}
            <div
              class="flex-1 rounded-t-lg bg-slate-200 dark:bg-[var(--editorial-surface-subtle)]"
              style={`height: ${24 + (pulseIndex % 4) * 22}px;`}
            ></div>
          {/each}
        </div>
      {:else if dailyBars.length > 0}
        <div class="flex items-end gap-2 px-1">
          {#each dailyBars as bar (bar.date)}
            <div class="flex min-w-0 flex-1 flex-col items-center justify-end gap-1.5">
              {#if bar.isHeaviest && bar.total > 0}
                <span class="text-[11px] font-semibold text-slate-600 dark:text-[#98989d]">
                  {formatDurationLocalized(bar.total, { compact: true })}
                </span>
              {/if}
              <span
                class="block w-full max-w-[44px] rounded-t-md {bar.isToday || bar.isHeaviest ? 'bg-primary-500' : 'bg-slate-300 dark:bg-[var(--editorial-surface-subtle)]'}"
                style={`height: ${bar.heightPx}px;`}
              ></span>
              <span class="max-w-full truncate text-[11px] {bar.isToday ? 'font-bold text-primary-600 dark:text-primary-400' : 'text-slate-400 dark:text-[#636c76]'}">
                {bar.label}
              </span>
            </div>
          {/each}
        </div>
      {:else}
        <p class="py-6 text-center text-xs text-slate-400 dark:text-[#636c76]">{t('common.noRecords')}</p>
      {/if}
    </div>
  {/if}

  <!-- 主视觉：节奏卡 = 分类构成条 + 既有按小时活跃度图 -->
  <div class="page-card overview-panel overview-panel-featured mb-4">
    <div class="mb-3 flex items-center justify-between gap-3">
      <h3 class="page-section-title !mb-0">{rhythmCardTitle}</h3>
      <span class="hidden text-xs text-slate-400 dark:text-[#636c76] sm:inline">{t('overview.rhythmHint')}</span>
    </div>
    {#if loading || !stats}
      <div class="animate-pulse">
        <div class="mb-5 h-3.5 rounded-full bg-slate-200 dark:bg-[var(--editorial-surface-subtle)]"></div>
        <div class="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {#each [1,2,3,4] as _}
            <div class="min-h-[88px] rounded-[20px] bg-slate-50/88 p-4 dark:bg-[#1c1c1e]/30">
              <div class="h-3 w-16 rounded bg-slate-200 dark:bg-[var(--editorial-surface-subtle)]"></div>
              <div class="mt-4 h-7 w-20 rounded bg-slate-200 dark:bg-[var(--editorial-surface-subtle)]"></div>
            </div>
          {/each}
        </div>
        <div class="rounded-[20px] bg-slate-50/90 p-4 dark:bg-[#1c1c1e]/40">
          <div class="flex h-40 items-end gap-1.5">
            {#each Array(24) as _, hour}
              <div class="flex h-full flex-1 flex-col items-center justify-end">
                <div
                  class="w-full rounded-t-lg bg-slate-200 dark:bg-[var(--editorial-surface-subtle)]"
                  style={`height: ${Math.max(((hour % 6) + 2) * 12, 18)}%; opacity: 0.8;`}
                ></div>
                <div class="mt-2 h-2 w-7 rounded bg-slate-100 dark:bg-[rgba(255,255,255,0.09)]"></div>
              </div>
            {/each}
          </div>
        </div>
      </div>
    {:else}
      {#if compositionSegments.length > 0}
        <div class="mb-5">
          <div class="flex h-3.5 w-full gap-[2px]" role="group" aria-label={t('overview.compositionFilter')}>
            {#each compositionSegments as segment (segment.category)}
              <button
                type="button"
                class={`overview-composition-segment block h-full first:rounded-s-full last:rounded-e-full transition-[opacity,transform] focus:outline-none focus:ring-2 focus:ring-sky-300 ${selectedCompositionCategory && selectedCompositionCategory !== segment.category ? 'opacity-30' : 'opacity-100'} ${selectedCompositionCategory === segment.category ? 'scale-y-125' : ''}`}
                style={`width: ${segment.widthPct.toFixed(1)}%; min-width: 5px; background: ${segment.color};`}
                aria-label={`${segment.name} · ${formatDurationLocalized(segment.duration, { compact: true })} · ${segment.percent}%`}
                aria-pressed={selectedCompositionCategory === segment.category}
                on:click={() => toggleCompositionCategory(segment.category)}
              ></button>
            {/each}
          </div>
          <div class="mt-2.5 flex flex-wrap justify-center gap-x-2 gap-y-1.5">
            {#each compositionSegments as segment (segment.category)}
              <button
                type="button"
                class={`inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-xs transition-colors ${selectedCompositionCategory === segment.category ? 'bg-slate-100 text-slate-800 dark:bg-[var(--editorial-surface-subtle)] dark:text-[#f5f5f7]' : 'text-slate-500 hover:bg-slate-50 dark:text-[#86868b] dark:hover:bg-[#2c2c2e]'}`}
                aria-pressed={selectedCompositionCategory === segment.category}
                on:click={() => toggleCompositionCategory(segment.category)}
              >
                <span class="inline-block h-2 w-2 rounded-[3px]" style={`background: ${segment.color};`}></span>
                <span class="font-medium">{segment.name}</span>
                {formatDurationLocalized(segment.duration, { compact: true })}
                <span class="text-slate-400 dark:text-[#636c76]">{segment.percent}%</span>
              </button>
            {/each}
          </div>

          {#if selectedCompositionSummary}
            <div class="overview-composition-summary mx-auto mt-4 max-w-3xl rounded-2xl bg-slate-50/90 px-4 py-3 text-center dark:bg-[#1c1c1e]/35">
              <div class="grid gap-2 sm:grid-cols-3">
                <div class="overview-composition-kpi rounded-xl px-3 py-2 text-center">
                  <p class="text-[11px] text-slate-400 dark:text-[#636c76]">{t('overview.compositionDuration')}</p>
                  <p class="mt-1 text-sm font-semibold text-slate-800 dark:text-[#f5f5f7]">{formatDurationLocalized(selectedCompositionSummary.duration, { compact: true })}</p>
                </div>
                <div class="overview-composition-kpi rounded-xl px-3 py-2 text-center">
                  <p class="text-[11px] text-slate-400 dark:text-[#636c76]">{t('overview.compositionShare')}</p>
                  <p class="mt-1 text-sm font-semibold text-slate-800 dark:text-[#f5f5f7]">{selectedCompositionSummary.percentage}%</p>
                </div>
                <div class="overview-composition-kpi rounded-xl px-3 py-2 text-center">
                  <p class="text-[11px] text-slate-400 dark:text-[#636c76]">{t('overview.compositionActiveRange')}</p>
                  <p class="mt-1 text-sm font-semibold text-slate-800 dark:text-[#f5f5f7]">{formatCompositionActiveRange(selectedCompositionSummary.activeRange)}</p>
                </div>
              </div>
              {#if selectedCompositionSummary.primaryApps.length > 0}
                <div class="overview-composition-primary-apps mt-2 flex flex-wrap items-center justify-center gap-2 text-xs text-slate-500 dark:text-[#86868b]">
                  <span>{t('overview.compositionPrimaryApps')}</span>
                  {#each selectedCompositionSummary.primaryApps as app (app.appName)}
                    <span class="rounded-full bg-white px-2.5 py-1 dark:bg-[#2c2c2e]">
                      {app.appName} · {formatDurationLocalized(app.duration, { compact: true })}
                    </span>
                  {/each}
                </div>
              {/if}
            </div>
          {/if}
        </div>
      {/if}
      <ActivityHourlyChart
        embedded
        data={stats.hourly_activity_distribution}
        peakHourLabel={hourlyChartPeakHourLabel}
        peakDurationLabel={hourlyChartPeakDurationLabel}
        distributionTitle={hourlyChartDistributionTitle}
        distributionSubtitleKey={hourlyChartDistributionSubtitleKey}
        selectedCategory={selectedCompositionCategory}
        categoryBreakdown={hourlyCategoryBreakdown}
        categoryColors={hourlyCategoryColors}
        categoryNames={hourlyCategoryNames}
        appBreakdown={hourlyAppBreakdown}
        workDuration={stats?.work_time_duration || 0}
        workGoalMinutes={workGoalMinutes}
      />
    {/if}
  </div>

  <div class="overview-section-grid">
    <!-- 常驻网站：domain_usage 前 6，按域名聚合；点击行打开既有浏览器详情弹窗 -->
    <section class="page-card overview-section-card overview-panel overview-panel-subtle">
      <div class="mb-3 flex items-baseline justify-between gap-3">
        <h3 class="page-section-title !mb-0">{t('overview.topDomains')}</h3>
        <span class="text-xs text-slate-500 dark:text-[#86868b]">{t('overview.byDomainAggregated')}</span>
      </div>
      {#if loading || !stats}
        <div class="overview-domain-skeleton-list overview-browser-gallery animate-pulse space-y-1">
          {#each [1, 2, 3, 4, 5, 6] as _}
            <div class="overview-domain-row overview-domain-skeleton-row grid w-full grid-cols-[minmax(0,11rem)_minmax(7rem,1fr)_auto] items-center gap-3 px-2 py-2.5">
              <div class="overview-domain-heading overview-domain-skeleton-heading min-w-0 space-y-1.5">
                <div class="h-3 w-28 max-w-full rounded bg-slate-200 dark:bg-[var(--editorial-surface-subtle)]"></div>
                <div class="h-2 w-20 max-w-full rounded bg-slate-100 dark:bg-[rgba(255,255,255,0.07)]"></div>
              </div>
              <div class="overview-domain-skeleton-source min-w-0">
                <div class="overview-domain-skeleton-source-label h-2 w-24 max-w-full rounded bg-slate-200 dark:bg-[var(--editorial-surface-subtle)]"></div>
                <div class="overview-domain-source-track overview-domain-skeleton-source-track mt-1.5 h-2 w-full rounded-full !bg-slate-100 dark:!bg-[rgba(255,255,255,0.14)]/50"></div>
              </div>
              <div class="overview-domain-skeleton-duration h-3 w-12 justify-self-end rounded bg-slate-100 dark:bg-[rgba(255,255,255,0.07)]"></div>
            </div>
          {/each}
        </div>
      {:else if topDomainPresentations.length > 0}
        <div class="overview-browser-gallery flex flex-col gap-1">
          {#each topDomainPresentations as domain (domain.domain)}
            <button
              type="button"
              class="overview-domain-row grid w-full grid-cols-[minmax(0,11rem)_minmax(7rem,1fr)_auto] items-center gap-3 rounded-lg !bg-transparent px-2 py-2.5 text-start transition-colors hover:!bg-slate-100/70 focus:outline-none focus-visible:!bg-slate-100/70 dark:hover:!bg-[#2c2c2e]/70 dark:focus-visible:!bg-[#2c2c2e]/70"
              on:click={() => openDomainDetail(domain)}
            >
              <span class="overview-domain-heading min-w-0">
                <span class="block truncate text-sm font-semibold text-slate-700 dark:text-[#98989d]">
                  {getBrowserDomainDisplayLabel(domain)}
                </span>
                <span class="overview-domain-meta overview-domain-category-meta mt-0.5 flex items-center gap-1.5 truncate text-[11px] text-slate-500 dark:text-[#86868b]">
                  <span>{t('overview.sitePagesMeta', { count: domain.presentation.pageCount })}</span>
                  <span aria-hidden="true">·</span>
                  <span class="overview-semantic-color-dot h-1.5 w-1.5 shrink-0 rounded-full" style={`background-color: ${getSemanticCategoryColor(domain.semantic_category)};`}></span>
                  <span class="truncate">{getDomainSemanticLabel(domain)}</span>
                </span>
              </span>
              <span class="min-w-0">
                <span class="overview-domain-source-list block truncate text-[11px] text-slate-500 dark:text-[#86868b]">
                  {domain.presentation.sourceLabel || t('overview.domainSourcesUnknown')}
                </span>
                <span class="overview-domain-source-track mt-1.5 flex h-2 overflow-hidden rounded-full !bg-slate-100 dark:!bg-[rgba(255,255,255,0.14)]/50">
                  {#each domain.presentation.sourceTrack as source, sourceIndex (source.browser_name)}
                    <span
                      class="overview-domain-source-segment block h-full"
                      style={`width: ${source.widthPct}%; background: hsl(${205 + sourceIndex * 38} 62% 58%);`}
                      title={`${source.browser_name} · ${Math.round(source.percentage)}%`}
                    ></span>
                  {/each}
                </span>
              </span>
              <span class="overview-domain-duration min-w-[4.5rem] whitespace-nowrap text-end text-xs font-semibold tabular-nums text-slate-600 dark:text-[#98989d]">
                {formatDurationLocalized(domain.duration, { compact: true })}
              </span>
            </button>
          {/each}
        </div>
        <p class="mt-3 text-center text-xs text-slate-500 dark:text-[#86868b]">
          {t('overview.domainsFooter', { count: stats.domain_total_count || domainUsageItems.length, browsers: domainBrowsersLabel })}
          {#if (stats.domain_total_count || domainUsageItems.length) > 6}
            ·
            <button
              type="button"
              class="font-semibold text-primary-600 transition-colors hover:text-primary-700 disabled:cursor-wait disabled:opacity-60 dark:text-primary-400 dark:hover:text-primary-300"
              disabled={domainUsageLoading}
              on:click={toggleDomainUsageExpanded}
            >
              {domainUsageLoading
                ? t('common.loading')
                : domainUsageExpanded
                  ? t('common.collapse')
                  : t('overview.viewAll')}
            </button>
          {/if}
        </p>
      {:else}
        <div class="empty-state-compact">
          <div class="empty-state-icon !w-12 !h-12 !mb-3 shadow-none">
            <span class="text-xl">🌐</span>
          </div>
          <p class="empty-state-copy">{overviewNoWebsiteVisitsText}</p>
        </div>
      {/if}
    </section>

    <section class="page-card overview-section-card overview-panel overview-panel-subtle">
      <div class="mb-3 flex items-center justify-between gap-3">
        <h3 class="page-section-title !mb-0">{t('overview.appUsage')}</h3>
        <button
          type="button"
          class="page-control-btn-icon"
          title={appUsageViewModeLabel}
          on:click={() => {
            appUsageViewMode = appUsageViewMode === 'row' ? 'column' : 'row';
          }}
        >
          {#if appUsageViewMode === 'row'}
            <svg class="h-4 w-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M4 7h16M4 12h12M4 17h8" />
            </svg>
          {:else}
            <svg class="h-4 w-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M6 18V9m6 9V6m6 12v-4" />
            </svg>
          {/if}
        </button>
      </div>
      {#if loading || !stats}
        <div class="app-usage-chart__rows animate-pulse">
          {#each [1, 2, 3, 4, 5, 6] as _}
            <div class="app-usage-chart__row">
              <div class="app-usage-chart__heading gap-2.5">
                <div class="h-5 w-5 shrink-0 rounded bg-slate-200 dark:bg-[var(--editorial-surface-subtle)]"></div>
                <div class="min-w-0 flex-1 space-y-1.5">
                  <div class="h-3 w-24 max-w-full rounded bg-slate-200 dark:bg-[var(--editorial-surface-subtle)]"></div>
                  <div class="h-2 w-16 max-w-full rounded bg-slate-100 dark:bg-[rgba(255,255,255,0.07)]"></div>
                </div>
              </div>
              <div class="app-usage-chart__track !bg-slate-100 dark:!bg-[rgba(255,255,255,0.14)]/50"></div>
              <div class="app-usage-chart__duration h-3 w-12 justify-self-end rounded bg-slate-100 dark:bg-[rgba(255,255,255,0.07)]"></div>
            </div>
          {/each}
        </div>
      {:else if stats.app_usage.length > 0}
        <AppUsageChart data={stats.app_usage} mode={appUsageViewMode} embedded />
      {:else}
        <div class="empty-state-compact">
          <div class="empty-state-icon !w-12 !h-12 !mb-3 shadow-none">
            <span class="text-xl">📊</span>
          </div>
          <p class="empty-state-copy">{overviewNoAppStatsText}</p>
        </div>
      {/if}
    </section>
  </div>
  </div>
</div>

<!-- 域名摘要 / 单域名详情浮层 -->
{#if domainOverlayOpen}
<div class="modal-overlay overview-domain-overlay fixed inset-0 z-[140]">
  <button
    type="button"
    class="modal-backdrop-button"
    aria-label={t('window.close')}
    on:click={closeDomainOverlay}
  ></button>
  <section
    bind:this={domainOverlayDialog}
    use:trapFocus
    class="modal-panel overview-domain-dialog"
    role="dialog"
    aria-modal="true"
    aria-labelledby="overview-domain-overlay-title"
    aria-describedby="overview-domain-overlay-description"
    aria-hidden={(pendingDomainSemanticChange || pendingDeleteSemanticCategory) ? 'true' : undefined}
    inert={Boolean(pendingDomainSemanticChange || pendingDeleteSemanticCategory)}
    tabindex="-1"
  >
    <header class="modal-header overview-domain-modal-header">
      <div class="overview-domain-modal-heading">
        {#if domainOverlayView === 'detail' && domainCollection.length > 0}
          <button
            bind:this={domainOverlayBackButton}
            type="button"
            class="modal-close overview-domain-back-button"
            title={t('overview.viewAll')}
            aria-label={t('overview.viewAll')}
            on:click={showAllDomainSummaries}
          >
            <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 18l-6-6 6-6" />
            </svg>
          </button>
        {/if}
        <div class="overview-domain-modal-copy">
          <p class="overview-domain-modal-kicker">{t('overview.topDomains')}</p>
          <h3 id="overview-domain-overlay-title" class="modal-title">
            {domainOverlayView === 'all'
              ? t('overview.domainListTitle')
              : (selectedDomainDetail ? getBrowserDomainDisplayLabel(selectedDomainDetail) : t('overview.domainDetailTitle'))}
          </h3>
          <p id="overview-domain-overlay-description" class="overview-domain-modal-description">
            {#if domainOverlayView === 'all'}
              {t('overview.sitesCount', { count: domainCollectionTotalCount })}
            {:else if selectedDomainDetail}
              {formatDuration(selectedDomainDetail.duration)} · {t('overview.pagesCount', { count: selectedDomainDetail.urls?.length || 0 })}
            {:else}
              {t('overview.domainDetailTitle')}
            {/if}
          </p>
        </div>
      </div>
      <button
        type="button"
        class="modal-close"
        title={t('window.close')}
        aria-label={t('window.close')}
        on:click={closeDomainOverlay}
      >
        <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </header>

    <div class="modal-body overview-domain-modal-body" on:scroll={handleSemanticPopoverViewportChange}>
      {#if domainOverlayLoading}
        <div class="py-10 text-center text-sm text-slate-400 dark:text-[#636c76]">{t('common.loading')}</div>
      {:else if domainOverlayError}
        <div class="mx-auto max-w-md rounded-2xl bg-red-50 px-4 py-5 text-center text-sm text-red-600 dark:bg-red-950/20 dark:text-red-300">
          <p>{t('overview.domainLoadFailed')}</p>
          <p class="mt-1 break-words text-xs opacity-80">{domainOverlayError}</p>
        </div>
      {:else if domainOverlayView === 'all'}
        <div class="overview-domain-summary-list space-y-2">
          {#each domainCollection as domain (domain.domain)}
            {@const summaryPresentation = buildDomainPresentation(domain)}
            <button
              type="button"
              data-domain-summary
              class="overview-domain-summary-row grid w-full grid-cols-[minmax(0,1fr)_auto] gap-3 rounded-2xl border border-slate-200/80 px-4 py-3 text-start transition-colors hover:border-sky-200 hover:bg-sky-50/45 focus:outline-none focus:ring-2 focus:ring-sky-300 dark:border-[var(--surface-border-default)] dark:hover:border-sky-800/70 dark:hover:bg-sky-950/10"
              on:click={() => selectDomainFromCollection(domain)}
            >
              <span class="min-w-0">
                <span class="overview-domain-heading block truncate text-sm font-semibold text-slate-800 dark:text-[#f5f5f7]">{getBrowserDomainDisplayLabel(domain)}</span>
                <span class="overview-domain-meta mt-1 flex items-center gap-1.5 text-xs text-slate-400 dark:text-[#636c76]">
                  <span>{t('overview.sitePagesMeta', { count: summaryPresentation.pageCount })}</span>
                  <span aria-hidden="true">·</span>
                  <span class="h-1.5 w-1.5 rounded-full" style={`background-color: ${getSemanticCategoryColor(domain.semantic_category)};`}></span>
                  <span class="truncate">{getDomainSemanticLabel(domain)}</span>
                </span>
                <span class="overview-domain-source-list mt-2 block truncate text-[11px] text-slate-500 dark:text-[#86868b]">
                  {summaryPresentation.sourceLabel || t('overview.domainSourcesUnknown')}
                </span>
                <span class="overview-domain-source-track mt-1.5 flex h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-[var(--editorial-surface-subtle)]/70">
                  {#each summaryPresentation.sourceTrack as source, sourceIndex (source.browser_name)}
                    <span
                      class="overview-domain-source-segment block h-full"
                      style={`width: ${source.widthPct}%; background: hsl(${205 + sourceIndex * 38} 62% 58%);`}
                    ></span>
                  {/each}
                </span>
              </span>
              <span class="self-center text-xs font-semibold text-slate-600 dark:text-[#98989d]">{formatDurationLocalized(domain.duration, { compact: true })}</span>
            </button>
          {/each}
          {#if domainCollection.length === 0}
            <div class="py-10 text-center text-sm text-slate-400 dark:text-[#636c76]">{t('common.noRecords')}</div>
          {/if}
        </div>
      {:else if domainOverlayView === 'detail'}
      {#each (selectedDomainDetail ? [selectedDomainDetail] : []) as domain}
        {@const domainPresentation = buildDomainPresentation(domain)}
        <div class="overview-domain-detail-source rounded-2xl bg-slate-50/80 p-3 dark:bg-[#2c2c2e]/45">
          <div class="overview-domain-source-list flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 dark:text-[#86868b]">
            <span>{domainPresentation.sourceLabel || t('overview.domainSourcesUnknown')}</span>
            <span>{formatDurationLocalized(domain.duration, { compact: true })}</span>
          </div>
          <div class="overview-domain-source-track mt-2 flex h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-[var(--editorial-surface-subtle)]/70">
            {#each domainPresentation.sourceTrack as source, sourceIndex (source.browser_name)}
              <span
                class="overview-domain-source-segment block h-full"
                style={`width: ${source.widthPct}%; background: hsl(${205 + sourceIndex * 38} 62% 58%);`}
                title={`${source.browser_name} · ${Math.round(source.percentage)}%`}
              ></span>
            {/each}
          </div>
        </div>
        <div class="overview-domain-detail relative">
          <!-- 域名头部 -->
          <div class="overview-domain-detail-header flex items-center justify-between">
            <div class="flex items-center gap-2">
              <span class="w-2 h-2 rounded-full bg-primary-500"></span>
              <span class="font-medium text-slate-700 dark:text-[#98989d]">{getBrowserDomainDisplayLabel(domain)}</span>
              <span class="text-xs text-slate-400 bg-slate-200 dark:bg-[var(--editorial-surface-subtle)] px-1.5 py-0.5 rounded">
                {t('overview.modalPages', { count: domain.urls.length })}
              </span>
            </div>
            <div class="flex items-center gap-2">
              {#if isUnresolvedBrowserDomain(domain)}
                <span class="text-xs px-2 py-1 rounded-full bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                  {t('overview.unresolvedPage')}
                </span>
              {:else}
                <span class="overview-domain-category-badge flex items-center gap-1.5">
                  <span
                    class="overview-semantic-color-dot h-1.5 w-1.5 shrink-0 rounded-full"
                    style={`background-color: ${getSemanticCategoryColor(domain.semantic_category)};`}
                  ></span>
                  {t('overview.currentCategory', { label: getDomainSemanticLabel(domain) })}
                </span>
                <button
                  type="button"
                  class="overview-domain-category-trigger"
                  aria-haspopup="dialog"
                  aria-expanded={editingDomainKey === domain.domain}
                  aria-controls={`semantic-category-popover-${domain.domain}`}
                  use:registerDomainSemanticTrigger={domain.domain}
                  on:click={() => {
                    if (editingDomainKey === domain.domain) {
                      cancelDomainSemanticEdit();
                    } else {
                      startDomainSemanticEdit(domain);
                    }
                  }}
                >
                  {t('overview.changeCategory')}
                </button>
              {/if}
              <span class="text-sm font-medium text-slate-700 dark:text-[#98989d]">{formatDuration(domain.duration)}</span>
            </div>
          </div>

          {#if !isUnresolvedBrowserDomain(domain) && editingDomainKey === domain.domain}
            <div
              bind:this={semanticCategoryPopover}
              use:trapFocus
              id={`semantic-category-popover-${domain.domain}`}
              class="overview-semantic-popover fixed z-[160]"
              role="dialog"
              tabindex="-1"
              aria-labelledby={`semantic-category-title-${domain.domain}`}
              style={semanticPopoverStyle}
            >
              <div class="overview-semantic-popover-header flex items-start justify-between gap-3">
                <div class="min-w-0">
                  <p id={`semantic-category-title-${domain.domain}`} class="overview-semantic-popover-title">{t('overview.selectCategory')}</p>
                  <p class="mt-0.5 truncate text-[11px] text-slate-400 dark:text-[#636c76]">{getBrowserDomainDisplayLabel(domain)}</p>
                </div>
                <button
                  type="button"
                  class="modal-close overview-semantic-popover-close"
                  on:click={cancelDomainSemanticEdit}
                  aria-label={t('window.close')}
                  title={t('window.close')}
                >
                  ×
                </button>
              </div>

              <p class="py-2 text-[11px] leading-relaxed text-slate-400 dark:text-[#86868b]">
                {t('overview.semanticCategoryHelp')}
              </p>

              <div class="space-y-1">
                {#each getSemanticCategoryOptions() as cat (cat.key)}
                  <div class="group flex items-center gap-1">
                    <button
                      type="button"
                      class="overview-semantic-option flex min-w-0 flex-1 items-center justify-between gap-3 rounded-xl px-2.5 py-2 text-start text-sm transition-colors
                        {editingSemanticCategory === cat.key
                          ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/20 dark:text-primary-200'
                          : 'text-slate-700 hover:bg-slate-50 dark:text-[#98989d] dark:hover:bg-[#2c2c2e]'}"
                      aria-pressed={editingSemanticCategory === cat.key}
                      disabled={isDomainSemanticSavePending(domain.domain)}
                      on:click={() => editingSemanticCategory = cat.key}
                    >
                      <span class="flex min-w-0 items-center gap-2">
                        <span
                          class="overview-semantic-color-dot h-2 w-2 shrink-0 rounded-full"
                          style={`background-color: ${getSemanticCategoryColor(cat.key)};`}
                        ></span>
                        <span class="truncate">{getSemanticCategoryDisplayName(cat)}</span>
                      </span>
                      {#if editingSemanticCategory === cat.key}
                        <svg class="overview-semantic-check h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
                        </svg>
                      {/if}
                    </button>
                    {#if !cat.is_system}
                      <button
                        type="button"
                        on:click={() => startRenameSemanticCategory(cat)}
                        class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs text-slate-400 opacity-0 transition-all hover:bg-blue-50 hover:text-blue-600 focus-visible:opacity-100 group-hover:opacity-100 dark:hover:bg-blue-900/20 dark:hover:text-blue-300"
                        disabled={semanticCategorySaving}
                        title={t('overview.renameSemanticCategory')}
                        aria-label={t('overview.renameSemanticCategory')}
                      >✎</button>
                      <button
                        type="button"
                        on:click={() => requestDeleteSemanticCategory(cat, domain)}
                        class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm text-slate-400 opacity-0 transition-all hover:bg-red-50 hover:text-red-600 focus-visible:opacity-100 group-hover:opacity-100 dark:hover:bg-red-900/20 dark:hover:text-red-300"
                        disabled={semanticCategorySaving}
                        title={t('overview.deleteSemanticCategory')}
                        aria-label={t('overview.deleteSemanticCategory')}
                      >×</button>
                    {/if}
                  </div>
                {/each}
              </div>

              <button
                type="button"
                on:click={() => {
                  showCreateSemanticCategory = !showCreateSemanticCategory;
                  showRenameSemanticCategory = false;
                }}
                class="mt-2 flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-slate-200 px-3 py-2 text-xs font-medium text-slate-500 transition-colors hover:border-primary-300 hover:text-primary-600 dark:border-[var(--surface-border-default)] dark:text-[#86868b] dark:hover:border-[rgba(255,255,255,0.24)] dark:hover:text-primary-300"
                disabled={semanticCategorySaving}
              >
                <span>{showCreateSemanticCategory ? '×' : '+'}</span>
                <span>{t('overview.createSemanticCategory')}</span>
              </button>

              {#if showCreateSemanticCategory}
                <div class="mt-2 space-y-2 rounded-xl bg-slate-50 p-2.5 dark:bg-[#2c2c2e]/70">
                  <p class="text-[11px] text-slate-500 dark:text-[#86868b]">{t('overview.createSemanticCategoryHint')}</p>
                  <input
                    type="text"
                    bind:value={newSemanticCategoryName}
                    placeholder={t('overview.semanticCategoryNamePlaceholder')}
                    class="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-sm dark:border-[var(--surface-border-default)] dark:bg-[#000000]"
                  />
                  <div class="flex justify-end gap-2">
                    <button
                      type="button"
                      on:click={() => showCreateSemanticCategory = false}
                      class="px-2.5 py-1.5 text-xs text-slate-500 dark:text-[#86868b]"
                    >{t('overview.cancel')}</button>
                    <button
                      type="button"
                      on:click={createCustomSemanticCategory}
                      class="rounded-lg bg-primary-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-primary-700"
                    >{t('overview.confirmChange')}</button>
                  </div>
                </div>
              {/if}

              {#if showRenameSemanticCategory}
                <div class="mt-2 space-y-2 rounded-xl bg-blue-50/70 p-2.5 dark:bg-blue-900/15">
                  <p class="text-[11px] text-slate-500 dark:text-[#86868b]">{t('overview.renameSemanticCategory')}</p>
                  <input
                    type="text"
                    bind:value={renameSemanticName}
                    placeholder={t('overview.semanticCategoryNamePlaceholder')}
                    class="w-full rounded-lg border border-blue-200 bg-white px-2.5 py-2 text-sm dark:border-blue-900/50 dark:bg-[#000000]"
                  />
                  <div class="flex justify-end gap-2">
                    <button
                      type="button"
                      on:click={() => showRenameSemanticCategory = false}
                      class="px-2.5 py-1.5 text-xs text-slate-500 dark:text-[#86868b]"
                    >{t('overview.cancel')}</button>
                    <button
                      type="button"
                      on:click={saveRenameSemanticCategory}
                      class="rounded-lg bg-primary-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-primary-700"
                    >{t('overview.confirmChange')}</button>
                  </div>
                </div>
              {/if}

              <div class="mt-3 flex items-center justify-end gap-3 border-t border-slate-100 pt-3 dark:border-[var(--surface-border-default)]">
                <div class="flex shrink-0 items-center gap-2">
                  <button
                    type="button"
                    class="rounded-lg px-2.5 py-1.5 text-xs text-slate-500 transition-colors hover:bg-slate-100 dark:text-[#86868b] dark:hover:bg-[#2c2c2e]"
                    disabled={isDomainSemanticSavePending(domain.domain)}
                    on:click={cancelDomainSemanticEdit}
                  >{t('overview.cancel')}</button>
                  <button
                    type="button"
                    class="rounded-lg bg-primary-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-primary-700 disabled:opacity-50"
                    disabled={!editingSemanticCategory.trim() || isDomainSemanticSavePending(domain.domain)}
                    on:click={() => saveDomainSemanticRule(domain)}
                  >
                    {isDomainSemanticSavePending(domain.domain) ? t('overview.saving') : t('overview.save')}
                  </button>
                </div>
              </div>
            </div>
          {/if}
          
          <!-- URL 列表，支持展开/收起超出的部分 -->
          <div class="overview-domain-url-list overflow-hidden">
            {#each (expandedDomains.has(domain.domain) ? domain.urls : domain.urls.slice(0, 10)) as url}
              <div class="overview-domain-url-row flex items-center justify-between">
                <div class="flex-1 min-w-0 mr-3">
                  <p
                    class="text-sm text-slate-700 dark:text-[#98989d] truncate"
                    title={formatBrowserUrlForDisplay(url.url)}
                  >
                    {formatBrowserUrlForDisplay(url.url)}
                  </p>
                </div>
                <span class="text-xs text-slate-400 whitespace-nowrap">{formatDuration(url.duration)}</span>
              </div>
            {/each}
            {#if domain.urls.length > 10}
              <!-- 展开/收起按钮，让用户可以查看全部 URL -->
              <button
                class="w-full p-3 text-center text-xs text-primary-600 hover:text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/10 transition-colors flex items-center justify-center gap-1"
                on:click={() => {
                  if (expandedDomains.has(domain.domain)) {
                    expandedDomains.delete(domain.domain);
                  } else {
                    expandedDomains.add(domain.domain);
                  }
                  expandedDomains = expandedDomains;
                }}
              >
                {#if expandedDomains.has(domain.domain)}
                  <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7"/></svg>
                  {t('common.collapse')}
                {:else}
                  <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>
                  {t('common.expandAll', { count: domain.urls.length })}
                {/if}
              </button>
            {/if}
          </div>
        </div>
      {/each}

      {/if}
    </div>
  </section>
</div>
{/if}

<!-- 网站语义分类确认：从选择 Popover 切换到单一确认层 -->
{#if pendingDomainSemanticChange || pendingDeleteSemanticCategory}
  {@const isDeleteSemanticCategory = !!pendingDeleteSemanticCategory}
  {@const semanticActionBusy = isOverviewSemanticActionBusy()}
  {@const cancelSemanticAction = isDeleteSemanticCategory ? cancelDeleteSemanticCategory : cancelDomainSemanticChange}
  {@const confirmSemanticAction = isDeleteSemanticCategory ? confirmDeleteSemanticCategory : confirmDomainSemanticRule}
  <div class="modal-overlay overview-semantic-action-overlay">
    <button
      type="button"
      class="modal-backdrop-button"
      aria-label={t('window.close')}
      disabled={semanticActionBusy}
      on:click={cancelSemanticAction}
    ></button>
    <section
      class="modal-panel overview-semantic-confirm-dialog"
      use:trapFocus
      role="dialog"
      aria-modal="true"
      aria-labelledby="overview-semantic-confirm-title"
      aria-describedby="overview-semantic-confirm-description"
      tabindex="-1"
    >
      <header class="modal-header">
        <div class="overview-semantic-confirm-header-copy">
          <p class:overview-semantic-confirm-kicker-danger={isDeleteSemanticCategory} class="overview-semantic-confirm-kicker">
            {isDeleteSemanticCategory ? t('overview.deleteSemanticCategory') : t('overview.changeCategory')}
          </p>
          <h3 id="overview-semantic-confirm-title" class="modal-title">
            {isDeleteSemanticCategory ? t('overview.deleteSemanticCategoryTitle') : t('overview.changeDomainCategoryTitle')}
          </h3>
        </div>
        <button
          type="button"
          class="modal-close"
          aria-label={t('window.close')}
          title={t('window.close')}
          disabled={semanticActionBusy}
          on:click={cancelSemanticAction}
        >
          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </header>

      <div class="modal-body">
        <div class="overview-semantic-confirm-layout">
          <span class:overview-semantic-confirm-icon-danger={isDeleteSemanticCategory} class="overview-semantic-confirm-icon">
            {#if isDeleteSemanticCategory}
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M5 7h14M9 7V4h6v3m-7 3v7m4-7v7m4-7v7M7 7l1 13h8l1-13" />
              </svg>
            {:else}
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M4 5h7l9 9-6 6-9-9L4 5Zm4.5 3.5h.01" />
              </svg>
            {/if}
          </span>
          <div class="overview-semantic-confirm-copy">
            <p id="overview-semantic-confirm-description">
              {#if isDeleteSemanticCategory}
                {t('overview.deleteSemanticCategoryMessage', { category: pendingDeleteSemanticCategory.name })}
              {:else}
                {t('overview.changeDomainCategoryMessage', {
                  domain: pendingDomainSemanticChange.domainKey,
                  category: pendingDomainSemanticChange.categoryName,
                })}
              {/if}
            </p>
            <div class="overview-semantic-confirm-detail">
              {isDeleteSemanticCategory ? pendingDeleteSemanticCategory.name : pendingDomainSemanticChange.domainKey}
            </div>
          </div>
        </div>
      </div>

      <footer class="modal-footer">
        <span class="overview-semantic-confirm-footer-note">Esc · {t('overview.cancel')}</span>
        <button
          type="button"
          class="overview-semantic-confirm-button"
          disabled={semanticActionBusy}
          on:click={cancelSemanticAction}
        >
          {t('overview.cancel')}
        </button>
        <button
          type="button"
          class:overview-semantic-confirm-button-danger={isDeleteSemanticCategory}
          class:overview-semantic-confirm-button-primary={!isDeleteSemanticCategory}
          class="overview-semantic-confirm-button"
          disabled={semanticActionBusy}
          on:click={confirmSemanticAction}
        >
          {isDeleteSemanticCategory ? t('overview.confirmDeleteSemanticCategory') : t('overview.confirmChange')}
        </button>
      </footer>
    </section>
  </div>
{/if}
