//! 独立护眼计时、休息层管理与单周期确定性回顾。
//!
//! 这里故意不依赖录制、截图、OCR 任务或 AI：计时只消费单调时钟增量和
//! 系统输入/锁屏信号；回顾只读取现有数据库中已经采集并经过隐私规则的数据。

use crate::config::{AppConfig, PrivacyConfig};
use crate::database::Activity;
use crate::error::AppError;
use crate::AppState;
use serde::{Deserialize, Serialize};
use std::collections::{HashMap, HashSet};
use std::path::Path;
use std::sync::{Arc, Mutex};
use tauri::{
    AppHandle, Emitter, Manager, PhysicalPosition, PhysicalSize, Position, Size, State, WebviewUrl,
    WebviewWindowBuilder,
};

pub const OVERLAY_PREFIX: &str = "eye-care-overlay-";
pub const PRE_BREAK_LABEL: &str = "eye-care-pre-break";
pub const STATUS_EVENT: &str = "eye-care-status-changed";
pub const RECAP_EVENT: &str = "eye-care-recap-ready";
const PRE_BREAK_CARD_WIDTH: f64 = 420.0;
const PRE_BREAK_CARD_HEIGHT: f64 = 124.0;
const PRE_BREAK_TRANSPARENT_GUTTER: f64 = 12.0;
const PRE_BREAK_SCREEN_MARGIN: f64 = 24.0;
const MAX_TRUSTED_RESTART_GAP_SECS: i64 = 7 * 24 * 60 * 60;
const MAX_TRUSTED_RESTART_GAP_MS: u64 = MAX_TRUSTED_RESTART_GAP_SECS as u64 * 1_000;
const UNKNOWN_TICK_GAP_MS: u64 = 5_000;
const MAX_DIAGNOSTIC_EVENTS: usize = 24;
// 新一轮只在确认出现新的键鼠输入时开始；这不是日常计时阈值。
const FRESH_INPUT_IDLE_MAX_MS: u64 = 2_000;

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum EyeCarePhase {
    Working,
    PreBreak,
    Resting,
    WaitingReturn,
}

#[derive(Debug, Clone, Copy, Default, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum EyeCareTimerReason {
    Disabled,
    Paused,
    Counting,
    ShortIdle,
    #[default]
    InputUnavailable,
    Locked,
    SuspendedOrUnknown,
    NaturalRest,
    Resting,
    WaitingReturn,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct EyeCareDiagnosticEvent {
    pub reason: EyeCareTimerReason,
    pub occurred_at: i64,
    pub counted_work_seconds: u64,
}

#[derive(Debug, Clone, Copy)]
pub struct EyeCareConfig {
    pub enabled: bool,
    pub paused: bool,
    pub work_ms: u64,
    pub rest_ms: u64,
    pub input_grace_ms: u64,
    pub natural_rest_ms: u64,
    pub pre_break_ms: u64,
}

impl From<&AppConfig> for EyeCareConfig {
    fn from(config: &AppConfig) -> Self {
        Self {
            enabled: config.eye_care_enabled,
            paused: config.eye_care_paused,
            work_ms: config.eye_care_work_minutes.saturating_mul(60_000),
            rest_ms: config.eye_care_rest_minutes.saturating_mul(60_000),
            input_grace_ms: config.eye_care_input_grace_seconds.saturating_mul(1_000),
            natural_rest_ms: config.eye_care_natural_rest_minutes.saturating_mul(60_000),
            pre_break_ms: config.eye_care_pre_break_seconds.saturating_mul(1_000),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EyeCareRuntime {
    pub phase: EyeCarePhase,
    pub accumulated_work_ms: u64,
    pub rest_remaining_ms: u64,
    pub fixed_rest_total_ms: u64,
    pub cycle_started_at: i64,
    pub break_started_at: Option<i64>,
    pub recap_cycle_started_at: Option<i64>,
    pub recap_break_started_at: Option<i64>,
    #[serde(default)]
    system_away_ms: u64,
    #[serde(default)]
    awaiting_fresh_activity: bool,
    #[serde(default)]
    saved_suspend_clock_ms: Option<u64>,
    #[serde(default)]
    short_idle_ms: u64,
    #[serde(default)]
    locked_ms: u64,
    #[serde(default)]
    suspended_ms: u64,
    #[serde(default)]
    unavailable_ms: u64,
    #[serde(default)]
    paused_ms: u64,
    #[serde(default)]
    timer_reason: EyeCareTimerReason,
    #[serde(default)]
    diagnostic_events: Vec<EyeCareDiagnosticEvent>,
    #[serde(skip, default)]
    last_input_idle_ms: Option<u64>,
    #[serde(skip, default)]
    last_observed_at: i64,
    pub saved_at: i64,
}

#[derive(Debug, Clone, Copy, Default, PartialEq, Eq)]
pub struct EyeCareTransition {
    pub entered_rest: bool,
    pub completed_rest: bool,
    pub returned: bool,
    pub natural_reset: bool,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct EyeCareStatus {
    pub phase: EyeCarePhase,
    pub enabled: bool,
    pub paused: bool,
    pub elapsed_seconds: u64,
    pub remaining_seconds: u64,
    pub progress: f64,
    pub cycle_started_at: i64,
    pub break_started_at: Option<i64>,
    pub timer_reason: EyeCareTimerReason,
    pub counting: bool,
    pub counted_work_seconds: u64,
    pub excluded_seconds: u64,
    pub short_idle_seconds: u64,
    pub locked_seconds: u64,
    pub suspended_seconds: u64,
    pub unavailable_seconds: u64,
    pub paused_seconds: u64,
    pub observed_seconds: u64,
    pub input_idle_seconds: Option<u64>,
    pub observed_at: i64,
    pub recent_events: Vec<EyeCareDiagnosticEvent>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct EyeCareUsageItem {
    pub name: String,
    pub duration_seconds: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct EyeCareRecap {
    pub cycle_started_at: i64,
    pub break_started_at: i64,
    pub total_duration_seconds: i64,
    pub top_apps: Vec<EyeCareUsageItem>,
    pub top_websites: Vec<EyeCareUsageItem>,
    pub ocr_keywords: Vec<String>,
    pub empty: bool,
}

impl EyeCareRuntime {
    pub fn new(now_unix: i64) -> Self {
        Self {
            phase: EyeCarePhase::Working,
            accumulated_work_ms: 0,
            rest_remaining_ms: 0,
            fixed_rest_total_ms: 0,
            cycle_started_at: now_unix,
            break_started_at: None,
            recap_cycle_started_at: None,
            recap_break_started_at: None,
            system_away_ms: 0,
            awaiting_fresh_activity: false,
            saved_suspend_clock_ms: suspend_aware_clock_ms(),
            short_idle_ms: 0,
            locked_ms: 0,
            suspended_ms: 0,
            unavailable_ms: 0,
            paused_ms: 0,
            timer_reason: EyeCareTimerReason::InputUnavailable,
            diagnostic_events: Vec::new(),
            last_input_idle_ms: None,
            last_observed_at: now_unix,
            saved_at: now_unix,
        }
    }

    pub fn load_or_default(path: &Path, now_unix: i64, config: EyeCareConfig) -> Self {
        Self::load_or_default_with_clock(
            path,
            now_unix,
            config,
            suspend_aware_clock_ms(),
            cfg!(windows),
        )
    }

    fn load_or_default_with_clock(
        path: &Path,
        now_unix: i64,
        config: EyeCareConfig,
        current_suspend_clock_ms: Option<u64>,
        is_windows: bool,
    ) -> Self {
        let loaded = std::fs::read(path)
            .ok()
            .and_then(|bytes| serde_json::from_slice::<Self>(&bytes).ok());
        let Some(mut runtime) = loaded else {
            return Self::new(now_unix);
        };

        let trusted_gap_ms = trusted_restart_gap_ms(
            runtime.saved_at,
            now_unix,
            runtime.saved_suspend_clock_ms,
            current_suspend_clock_ms,
            is_windows,
        );

        match runtime.phase {
            EyeCarePhase::Resting => {
                if trusted_gap_ms >= runtime.rest_remaining_ms {
                    runtime.finish_rest();
                } else {
                    runtime.rest_remaining_ms -= trusted_gap_ms;
                }
            }
            EyeCarePhase::Working | EyeCarePhase::PreBreak => {
                if trusted_gap_ms >= config.natural_rest_ms {
                    runtime.reset_cycle(now_unix, true);
                }
            }
            EyeCarePhase::WaitingReturn => {}
        }
        runtime.saved_suspend_clock_ms = current_suspend_clock_ms;
        runtime.timer_reason = match runtime.phase {
            EyeCarePhase::Resting => EyeCareTimerReason::Resting,
            EyeCarePhase::WaitingReturn => EyeCareTimerReason::WaitingReturn,
            EyeCarePhase::Working | EyeCarePhase::PreBreak if runtime.awaiting_fresh_activity => {
                EyeCareTimerReason::NaturalRest
            }
            EyeCarePhase::Working | EyeCarePhase::PreBreak => EyeCareTimerReason::InputUnavailable,
        };
        runtime.last_input_idle_ms = None;
        runtime.last_observed_at = now_unix;
        runtime.saved_at = now_unix;
        runtime
    }

    pub fn save(&mut self, path: &Path, now_unix: i64) -> Result<(), AppError> {
        self.saved_at = now_unix;
        self.saved_suspend_clock_ms = suspend_aware_clock_ms();
        let bytes = serde_json::to_vec_pretty(self)
            .map_err(|e| AppError::Unknown(format!("序列化护眼运行状态失败: {e}")))?;
        let temp = path.with_extension("json.tmp");
        let mut file = std::fs::File::create(&temp)
            .map_err(|e| AppError::Unknown(format!("创建护眼运行状态失败: {e}")))?;
        use std::io::Write;
        file.write_all(&bytes)
            .and_then(|_| file.sync_all())
            .map_err(|e| AppError::Unknown(format!("写入护眼运行状态失败: {e}")))?;
        drop(file);

        atomic_replace(&temp, path)
            .map_err(|e| AppError::Unknown(format!("保存护眼运行状态失败: {e}")))?;
        Ok(())
    }

    pub fn tick(
        &mut self,
        delta_ms: u64,
        input_idle_ms: Option<u64>,
        locked: bool,
        suspended_or_unknown_gap: bool,
        config: EyeCareConfig,
        now_unix: i64,
    ) -> EyeCareTransition {
        let mut transition = EyeCareTransition::default();
        self.last_input_idle_ms = input_idle_ms;
        self.last_observed_at = now_unix;

        if self.phase == EyeCarePhase::Resting {
            self.set_timer_reason(EyeCareTimerReason::Resting, now_unix);
            self.rest_remaining_ms = self.rest_remaining_ms.saturating_sub(delta_ms);
            if self.rest_remaining_ms == 0 {
                self.finish_rest();
                self.set_timer_reason(EyeCareTimerReason::WaitingReturn, now_unix);
                transition.completed_rest = true;
            }
            return transition;
        }

        // 日常计时允许阅读、思考等短暂无键鼠输入；休息结束或自然休息后，
        // 则仍必须等到一次新输入，不能因为旧输入尚在宽限内就启动新周期。
        let has_fresh_input = !locked
            && !suspended_or_unknown_gap
            && input_idle_ms.is_some_and(|idle_ms| idle_ms < FRESH_INPUT_IDLE_MAX_MS);
        let counts_as_screen_use = !locked
            && !suspended_or_unknown_gap
            && input_idle_ms.is_some_and(|idle_ms| idle_ms < config.input_grace_ms);

        if self.phase == EyeCarePhase::WaitingReturn {
            if has_fresh_input {
                self.reset_cycle(now_unix, false);
                self.set_timer_reason(EyeCareTimerReason::Counting, now_unix);
                transition.returned = true;
            } else {
                self.set_timer_reason(EyeCareTimerReason::WaitingReturn, now_unix);
            }
            return transition;
        }

        if !config.enabled {
            self.set_timer_reason(EyeCareTimerReason::Disabled, now_unix);
            return transition;
        }

        if config.paused {
            self.paused_ms = self.paused_ms.saturating_add(delta_ms);
            self.set_timer_reason(EyeCareTimerReason::Paused, now_unix);
            return transition;
        }

        if locked || suspended_or_unknown_gap {
            if locked {
                self.locked_ms = self.locked_ms.saturating_add(delta_ms);
                self.set_timer_reason(EyeCareTimerReason::Locked, now_unix);
            } else {
                self.suspended_ms = self.suspended_ms.saturating_add(delta_ms);
                self.set_timer_reason(EyeCareTimerReason::SuspendedOrUnknown, now_unix);
            }
            self.system_away_ms = self.system_away_ms.saturating_add(delta_ms);
            if self.system_away_ms >= config.natural_rest_ms {
                self.set_timer_reason(EyeCareTimerReason::NaturalRest, now_unix);
                self.reset_cycle(now_unix, true);
                transition.natural_reset = true;
            }
            return transition;
        }

        self.system_away_ms = 0;

        // 空闲探测不可用时属于未知输入区间，只暂停，不把“探测失败”当成活跃或自然离开。
        let Some(input_idle_ms) = input_idle_ms else {
            self.unavailable_ms = self.unavailable_ms.saturating_add(delta_ms);
            self.set_timer_reason(EyeCareTimerReason::InputUnavailable, now_unix);
            return transition;
        };

        if input_idle_ms >= config.natural_rest_ms {
            if self.accumulated_work_ms > 0 || !self.awaiting_fresh_activity {
                self.set_timer_reason(EyeCareTimerReason::NaturalRest, now_unix);
                self.reset_cycle(now_unix, true);
                transition.natural_reset = true;
            } else {
                self.set_timer_reason(EyeCareTimerReason::NaturalRest, now_unix);
            }
            return transition;
        }

        if self.awaiting_fresh_activity {
            if !has_fresh_input {
                self.set_timer_reason(EyeCareTimerReason::NaturalRest, now_unix);
                return transition;
            }
            self.cycle_started_at = now_unix;
            self.awaiting_fresh_activity = false;
        }

        // 超过无输入宽限但尚未达到自然休息阈值：暂停而不清空本轮。
        if !counts_as_screen_use {
            self.short_idle_ms = self.short_idle_ms.saturating_add(delta_ms);
            self.set_timer_reason(EyeCareTimerReason::ShortIdle, now_unix);
            return transition;
        }

        self.accumulated_work_ms = self.accumulated_work_ms.saturating_add(delta_ms);
        self.set_timer_reason(EyeCareTimerReason::Counting, now_unix);

        if self.accumulated_work_ms >= config.work_ms {
            self.phase = EyeCarePhase::Resting;
            self.fixed_rest_total_ms = config.rest_ms;
            self.rest_remaining_ms = config.rest_ms;
            self.break_started_at = Some(now_unix);
            self.recap_cycle_started_at = Some(self.cycle_started_at);
            self.recap_break_started_at = Some(now_unix);
            self.set_timer_reason(EyeCareTimerReason::Resting, now_unix);
            transition.entered_rest = true;
        } else if self.accumulated_work_ms
            >= config
                .work_ms
                .saturating_sub(config.pre_break_ms.min(config.work_ms))
        {
            self.phase = EyeCarePhase::PreBreak;
        } else {
            self.phase = EyeCarePhase::Working;
        }

        transition
    }

    pub fn emergency_release(&mut self, now_unix: i64) {
        if self.phase == EyeCarePhase::Resting {
            self.finish_rest();
            self.set_timer_reason(EyeCareTimerReason::WaitingReturn, now_unix);
            self.saved_at = now_unix;
        }
    }

    pub fn status(&self, config: EyeCareConfig) -> EyeCareStatus {
        let (elapsed_ms, remaining_ms, progress) = match self.phase {
            EyeCarePhase::Resting => {
                let total = self.fixed_rest_total_ms.max(1);
                let elapsed = total.saturating_sub(self.rest_remaining_ms);
                (
                    elapsed,
                    self.rest_remaining_ms,
                    elapsed as f64 / total as f64,
                )
            }
            EyeCarePhase::WaitingReturn => (0, 0, 1.0),
            EyeCarePhase::Working | EyeCarePhase::PreBreak => {
                let total = config.work_ms.max(1);
                (
                    self.accumulated_work_ms,
                    total.saturating_sub(self.accumulated_work_ms),
                    self.accumulated_work_ms.min(total) as f64 / total as f64,
                )
            }
        };
        let excluded_ms = self
            .short_idle_ms
            .saturating_add(self.locked_ms)
            .saturating_add(self.suspended_ms)
            .saturating_add(self.unavailable_ms)
            .saturating_add(self.paused_ms);
        let counted_work_seconds = self.accumulated_work_ms / 1_000;
        let timer_reason = match self.phase {
            EyeCarePhase::Resting => EyeCareTimerReason::Resting,
            EyeCarePhase::WaitingReturn => EyeCareTimerReason::WaitingReturn,
            EyeCarePhase::Working | EyeCarePhase::PreBreak if !config.enabled => {
                EyeCareTimerReason::Disabled
            }
            EyeCarePhase::Working | EyeCarePhase::PreBreak if config.paused => {
                EyeCareTimerReason::Paused
            }
            EyeCarePhase::Working | EyeCarePhase::PreBreak => self.timer_reason,
        };
        EyeCareStatus {
            phase: self.phase,
            enabled: config.enabled,
            paused: config.paused,
            elapsed_seconds: elapsed_ms / 1_000,
            remaining_seconds: remaining_ms.saturating_add(999) / 1_000,
            progress: progress.clamp(0.0, 1.0),
            cycle_started_at: self.cycle_started_at,
            break_started_at: self.break_started_at,
            timer_reason,
            counting: timer_reason == EyeCareTimerReason::Counting,
            counted_work_seconds,
            excluded_seconds: excluded_ms / 1_000,
            short_idle_seconds: self.short_idle_ms / 1_000,
            locked_seconds: self.locked_ms / 1_000,
            suspended_seconds: self.suspended_ms / 1_000,
            unavailable_seconds: self.unavailable_ms / 1_000,
            paused_seconds: self.paused_ms / 1_000,
            observed_seconds: self.accumulated_work_ms.saturating_add(excluded_ms) / 1_000,
            input_idle_seconds: self.last_input_idle_ms.map(|value| value / 1_000),
            observed_at: self.last_observed_at,
            recent_events: self.diagnostic_events.clone(),
        }
    }

    fn set_timer_reason(&mut self, reason: EyeCareTimerReason, now_unix: i64) {
        if self.timer_reason == reason {
            return;
        }
        self.timer_reason = reason;
        self.diagnostic_events.push(EyeCareDiagnosticEvent {
            reason,
            occurred_at: now_unix,
            counted_work_seconds: self.accumulated_work_ms / 1_000,
        });
        if self.diagnostic_events.len() > MAX_DIAGNOSTIC_EVENTS {
            let overflow = self.diagnostic_events.len() - MAX_DIAGNOSTIC_EVENTS;
            self.diagnostic_events.drain(..overflow);
        }
    }

    fn reset_cycle(&mut self, now_unix: i64, await_activity: bool) {
        self.phase = EyeCarePhase::Working;
        self.accumulated_work_ms = 0;
        self.rest_remaining_ms = 0;
        self.fixed_rest_total_ms = 0;
        self.break_started_at = None;
        self.system_away_ms = 0;
        self.short_idle_ms = 0;
        self.locked_ms = 0;
        self.suspended_ms = 0;
        self.unavailable_ms = 0;
        self.paused_ms = 0;
        self.awaiting_fresh_activity = await_activity;
        self.cycle_started_at = now_unix;
    }

    fn finish_rest(&mut self) {
        self.phase = EyeCarePhase::WaitingReturn;
        self.rest_remaining_ms = 0;
        self.system_away_ms = 0;
        self.awaiting_fresh_activity = false;
    }
}

#[cfg(unix)]
fn atomic_replace(source: &Path, target: &Path) -> std::io::Result<()> {
    std::fs::rename(source, target)
}

#[cfg(windows)]
fn atomic_replace(source: &Path, target: &Path) -> std::io::Result<()> {
    use std::iter;
    use std::os::windows::ffi::OsStrExt;

    const MOVEFILE_REPLACE_EXISTING: u32 = 0x1;
    const MOVEFILE_WRITE_THROUGH: u32 = 0x8;

    #[link(name = "Kernel32")]
    extern "system" {
        fn MoveFileExW(
            existing_file_name: *const u16,
            new_file_name: *const u16,
            flags: u32,
        ) -> i32;
    }

    let source_wide = source
        .as_os_str()
        .encode_wide()
        .chain(iter::once(0))
        .collect::<Vec<_>>();
    let target_wide = target
        .as_os_str()
        .encode_wide()
        .chain(iter::once(0))
        .collect::<Vec<_>>();
    let replaced = unsafe {
        MoveFileExW(
            source_wide.as_ptr(),
            target_wide.as_ptr(),
            MOVEFILE_REPLACE_EXISTING | MOVEFILE_WRITE_THROUGH,
        )
    };
    if replaced == 0 {
        Err(std::io::Error::last_os_error())
    } else {
        Ok(())
    }
}

#[cfg(not(any(unix, windows)))]
fn atomic_replace(source: &Path, target: &Path) -> std::io::Result<()> {
    std::fs::rename(source, target)
}

/// Windows 的 `GetTickCount64` 不受墙上时间调整影响，并包含睡眠/休眠时间。
/// 它与 `Instant` 的差值只用于识别挂起区间，不用墙上时间逐 Tick 累计。
#[cfg(windows)]
pub fn suspend_aware_clock_ms() -> Option<u64> {
    use winapi::um::sysinfoapi::GetTickCount64;

    Some(unsafe { GetTickCount64() })
}

#[cfg(not(windows))]
pub fn suspend_aware_clock_ms() -> Option<u64> {
    None
}

pub fn resolve_tick_timing(
    monotonic_delta_ms: u64,
    suspend_clock_delta_ms: Option<u64>,
) -> (u64, bool) {
    let effective_delta_ms = suspend_clock_delta_ms
        .unwrap_or(monotonic_delta_ms)
        .max(monotonic_delta_ms);
    let detected_suspend = suspend_clock_delta_ms.is_some_and(|suspend_delta_ms| {
        suspend_delta_ms > monotonic_delta_ms.saturating_add(UNKNOWN_TICK_GAP_MS)
    });
    (
        effective_delta_ms,
        monotonic_delta_ms > UNKNOWN_TICK_GAP_MS || detected_suspend,
    )
}

fn trusted_restart_gap_ms(
    saved_at: i64,
    now_unix: i64,
    saved_suspend_clock_ms: Option<u64>,
    current_suspend_clock_ms: Option<u64>,
    require_suspend_clock: bool,
) -> u64 {
    let suspend_gap_ms = match (saved_suspend_clock_ms, current_suspend_clock_ms) {
        (Some(saved), Some(current)) if current >= saved => {
            let gap = current - saved;
            (gap <= MAX_TRUSTED_RESTART_GAP_MS).then_some(gap)
        }
        _ => None,
    };
    if require_suspend_clock {
        return suspend_gap_ms.unwrap_or(0);
    }
    if let Some(gap) = suspend_gap_ms {
        return gap;
    }

    // 非 Windows 平台尚无统一的跨挂起启动时钟，只把有限且非负的墙上时间差
    // 当作保守回退；它不参与进程存活期间的逐 Tick 累计。
    let wall_gap_secs = now_unix.saturating_sub(saved_at);
    if (0..=MAX_TRUSTED_RESTART_GAP_SECS).contains(&wall_gap_secs) {
        (wall_gap_secs as u64).saturating_mul(1_000)
    } else {
        0
    }
}

pub fn is_overlay_label(label: &str) -> bool {
    label.starts_with(OVERLAY_PREFIX)
}

pub fn close_overlay_windows(app: &AppHandle) {
    for (label, window) in app.webview_windows() {
        if is_overlay_label(&label) {
            let _ = window.hide();
            let _ = window.close();
        }
    }
}

pub fn close_pre_break_window(app: &AppHandle) {
    if let Some(window) = app.get_webview_window(PRE_BREAK_LABEL) {
        let _ = window.hide();
        let _ = window.close();
    }
}

fn should_show_pre_break(status: &EyeCareStatus) -> bool {
    status.phase == EyeCarePhase::PreBreak && status.enabled && !status.paused
}

pub fn sync_pre_break_window(app: &AppHandle, status: &EyeCareStatus) -> tauri::Result<()> {
    if !should_show_pre_break(status) {
        close_pre_break_window(app);
        return Ok(());
    }

    let monitor = if let Some(monitor) = app.primary_monitor()? {
        monitor
    } else if let Some(monitor) = app.available_monitors()?.into_iter().next() {
        monitor
    } else {
        return Ok(());
    };
    let scale = monitor.scale_factor();
    // 卡片四周保留真实透明像素。圆角抗锯齿与投影只和透明画布合成，
    // 不再暴露 WebView 物理矩形的根背景。
    let logical_width = PRE_BREAK_CARD_WIDTH + PRE_BREAK_TRANSPARENT_GUTTER * 2.0;
    let logical_height = PRE_BREAK_CARD_HEIGHT + PRE_BREAK_TRANSPARENT_GUTTER * 2.0;
    let width = (logical_width * scale).round().max(1.0) as u32;
    let height = (logical_height * scale).round().max(1.0) as u32;
    // 窗口边缘离屏幕 12px，内部 gutter 再提供 12px，使卡片仍保持 24px 边距。
    let window_margin =
        ((PRE_BREAK_SCREEN_MARGIN - PRE_BREAK_TRANSPARENT_GUTTER) * scale).round() as i32;
    let monitor_position = *monitor.position();
    let monitor_size = *monitor.size();
    let x = monitor_position
        .x
        .saturating_add(monitor_size.width.saturating_sub(width) as i32)
        .saturating_sub(window_margin);
    let y = monitor_position.y.saturating_add(window_margin);

    let window = if let Some(window) = app.get_webview_window(PRE_BREAK_LABEL) {
        window
    } else {
        WebviewWindowBuilder::new(
            app,
            PRE_BREAK_LABEL,
            WebviewUrl::App("pre-break.html".into()),
        )
        .title("WorkBreath Break Notice")
        .inner_size(logical_width, logical_height)
        .resizable(false)
        .maximizable(false)
        .minimizable(false)
        .closable(false)
        .decorations(false)
        .transparent(true)
        .visible(false)
        .always_on_top(true)
        .skip_taskbar(true)
        .shadow(false)
        .focused(false)
        .focusable(false)
        .content_protected(true)
        .build()?
    };
    let _ = window.set_position(Position::Physical(PhysicalPosition::new(x, y)));
    let _ = window.set_size(Size::Physical(PhysicalSize::new(width, height)));
    let _ = window.set_always_on_top(true);
    let _ = window.set_skip_taskbar(true);
    let _ = window.set_content_protected(true);
    let _ = window.set_ignore_cursor_events(true);
    let _ = window.show();
    let _ = window.unminimize();
    let _ = app.emit_to(PRE_BREAK_LABEL, STATUS_EVENT, status);
    Ok(())
}

pub fn sync_overlay_windows(app: &AppHandle, status: &EyeCareStatus) -> tauri::Result<()> {
    if status.phase != EyeCarePhase::Resting {
        close_overlay_windows(app);
        return Ok(());
    }

    let monitors = app.available_monitors()?;
    let expected_labels = (0..monitors.len())
        .map(|index| format!("{OVERLAY_PREFIX}{index}"))
        .collect::<HashSet<_>>();
    for (label, window) in app.webview_windows() {
        if is_overlay_label(&label) && !expected_labels.contains(&label) {
            let _ = window.hide();
            let _ = window.close();
        }
    }
    for (index, monitor) in monitors.iter().enumerate() {
        let label = format!("{OVERLAY_PREFIX}{index}");
        let position = *monitor.position();
        let size = *monitor.size();
        let window = if let Some(window) = app.get_webview_window(&label) {
            window
        } else {
            WebviewWindowBuilder::new(app, &label, WebviewUrl::default())
                .title("WorkBreath Rest")
                .inner_size(size.width as f64, size.height as f64)
                .position(position.x as f64, position.y as f64)
                .resizable(true)
                .maximizable(false)
                .minimizable(false)
                .closable(false)
                .decorations(false)
                .transparent(true)
                .visible(false)
                .always_on_top(true)
                .visible_on_all_workspaces(true)
                .skip_taskbar(true)
                .shadow(false)
                .focused(true)
                .build()?
        };

        // 已进入 fullscreen 的窗口不再重复设置 position/size/fullscreen，
        // 否则 watchdog 每秒一次的 set_position/set_size 会把窗口踢出 fullscreen。
        let already_fullscreen = window.is_fullscreen().unwrap_or(false);

        if !already_fullscreen {
            let _ = window.set_position(Position::Physical(PhysicalPosition::new(
                position.x, position.y,
            )));
            let _ = window.set_size(Size::Physical(PhysicalSize::new(size.width, size.height)));
            let _ = window.set_always_on_top(true);
            let _ = window.set_visible_on_all_workspaces(true);
            let _ = window.set_skip_taskbar(true);
            let _ = window.set_content_protected(true);
            let _ = window.show();
            let _ = window.unminimize();
            let _ = window.set_focus();
            // Windows 任务栏和 Linux GNOME 面板都是 topmost 窗口，
            // 只有进入 fullscreen 模式才会触发系统面板自动隐藏。
            // macOS 不需要：always_on_top + visible_on_all_workspaces 已能覆盖 Dock 和菜单栏。
            #[cfg(not(target_os = "macos"))]
            {
                let _ = window.set_fullscreen(true);
            }
        } else {
            let _ = window.show();
            let _ = window.set_focus();
        }
        let _ = app.emit_to(label.as_str(), STATUS_EVENT, status);
    }
    Ok(())
}

pub fn is_resting(app: &AppHandle) -> bool {
    app.try_state::<Arc<Mutex<AppState>>>()
        .map(|state| {
            let guard = state.lock().unwrap_or_else(|error| error.into_inner());
            guard.eye_care.phase == EyeCarePhase::Resting
        })
        .unwrap_or(false)
}

pub fn build_recap(state: &AppState, cycle_start: i64, break_start: i64) -> EyeCareRecap {
    let from = chrono::DateTime::from_timestamp(cycle_start, 0).map(|value| {
        value
            .with_timezone(&chrono::Local)
            .format("%Y-%m-%d")
            .to_string()
    });
    let to = chrono::DateTime::from_timestamp(break_start, 0).map(|value| {
        value
            .with_timezone(&chrono::Local)
            .format("%Y-%m-%d")
            .to_string()
    });
    let activities = state
        .database
        .get_activities_in_range(from.as_deref(), to.as_deref(), 10_000)
        .unwrap_or_default();
    let (ignored_apps, excluded_domains) = crate::privacy::collect_privacy_filters(&state.config);
    let activities =
        crate::commands::filter_activities_by_privacy(activities, &ignored_apps, &excluded_domains);

    build_recap_from_activities(activities, cycle_start, break_start)
}

fn build_recap_from_activities(
    activities: Vec<Activity>,
    cycle_start: i64,
    break_start: i64,
) -> EyeCareRecap {
    let mut apps: HashMap<String, i64> = HashMap::new();
    let mut sites: HashMap<String, i64> = HashMap::new();
    let mut keywords: HashMap<String, usize> = HashMap::new();
    let mut total = 0i64;

    for activity in activities
        .into_iter()
        .filter(|activity| !crate::is_own_app_window(&activity.app_name, &activity.window_title))
    {
        // Activity.timestamp 是区间终点。严格裁剪到本轮边界，避免把周期前的
        // 旧时长带进来，也保留在休息开始后才落库但实际与周期重叠的最后一段。
        let activity_end = activity.timestamp;
        let activity_start = activity_end.saturating_sub(activity.duration.max(0));
        let overlap_start = activity_start.max(cycle_start);
        let overlap_end = activity_end.min(break_start);
        let duration = overlap_end.saturating_sub(overlap_start);
        if duration <= 0 {
            continue;
        }
        total = total.saturating_add(duration);
        *apps.entry(activity.app_name.clone()).or_default() += duration;
        if let Some(url) = activity.browser_url.as_deref() {
            let domain = PrivacyConfig::extract_domain(url);
            if !domain.is_empty() {
                *sites.entry(domain).or_default() += duration;
            }
        }
        if let Some(ocr) = activity.ocr_text.as_deref() {
            for token in extract_ocr_tokens(ocr) {
                *keywords.entry(token).or_default() += 1;
            }
        }
    }

    EyeCareRecap {
        cycle_started_at: cycle_start,
        break_started_at: break_start,
        total_duration_seconds: total,
        top_apps: top_usage(apps, 5),
        top_websites: top_usage(sites, 5),
        ocr_keywords: top_keywords(keywords, 8),
        empty: total == 0,
    }
}

fn top_usage(values: HashMap<String, i64>, limit: usize) -> Vec<EyeCareUsageItem> {
    let mut items = values
        .into_iter()
        .map(|(name, duration_seconds)| EyeCareUsageItem {
            name,
            duration_seconds,
        })
        .collect::<Vec<_>>();
    items.sort_by(|a, b| {
        b.duration_seconds
            .cmp(&a.duration_seconds)
            .then_with(|| a.name.cmp(&b.name))
    });
    items.truncate(limit);
    items
}

fn extract_ocr_tokens(text: &str) -> Vec<String> {
    text.split(|ch: char| !(ch.is_alphanumeric() || ('\u{4e00}'..='\u{9fff}').contains(&ch)))
        .map(str::trim)
        .filter(|token| (2..=32).contains(&token.chars().count()))
        .filter(|token| !token.chars().all(|ch| ch.is_ascii_digit()))
        .map(|token| token.to_lowercase())
        .collect()
}

fn top_keywords(values: HashMap<String, usize>, limit: usize) -> Vec<String> {
    let mut items = values.into_iter().collect::<Vec<_>>();
    items.sort_by(|a, b| b.1.cmp(&a.1).then_with(|| a.0.cmp(&b.0)));
    items.truncate(limit);
    items.into_iter().map(|(token, _)| token).collect()
}

#[tauri::command]
pub async fn get_eye_care_status(
    state: State<'_, Arc<Mutex<AppState>>>,
) -> Result<EyeCareStatus, AppError> {
    let state = state.lock().map_err(|e| AppError::Unknown(e.to_string()))?;
    Ok(state.eye_care.status((&state.config).into()))
}

#[tauri::command]
pub async fn get_pending_eye_care_recap(
    state: State<'_, Arc<Mutex<AppState>>>,
) -> Result<Option<EyeCareRecap>, AppError> {
    let state = state.lock().map_err(|e| AppError::Unknown(e.to_string()))?;
    Ok(state.pending_eye_care_recap.clone())
}

#[tauri::command]
pub async fn dismiss_eye_care_recap(
    state: State<'_, Arc<Mutex<AppState>>>,
) -> Result<(), AppError> {
    let mut state = state.lock().map_err(|e| AppError::Unknown(e.to_string()))?;
    state.pending_eye_care_recap = None;
    Ok(())
}

/// 紧急退出休息层（不依赖 WebView 焦点）。
///
/// 可从两个入口调用：
/// 1. Rust 全局热键 Ctrl+Alt+Shift+F12 —— OS 级，WebView 崩溃也能生效
/// 2. Tauri command `eye_care_emergency_release` —— 前端 JS 长按 5 秒触发
pub fn try_emergency_release(app: &AppHandle) -> bool {
    let Some(state) = app.try_state::<Arc<Mutex<AppState>>>() else {
        return false;
    };
    let now = chrono::Utc::now().timestamp();
    let released = {
        let mut guard = state.lock().unwrap_or_else(|error| error.into_inner());
        if guard.eye_care.phase != EyeCarePhase::Resting {
            return false;
        }
        guard.eye_care.emergency_release(now);
        let path = guard.data_dir.join("eye-care-emergency.log");
        let line = format!("{now}\temergency release invoked\n");
        use std::io::Write;
        if let Ok(mut file) = std::fs::OpenOptions::new()
            .create(true)
            .append(true)
            .open(&path)
        {
            let _ = file.write_all(line.as_bytes());
        }
        true
    };
    if released {
        close_overlay_windows(app);
        let status = {
            let guard = state.lock().unwrap_or_else(|error| error.into_inner());
            guard.eye_care.status((&guard.config).into())
        };
        let _ = app.emit(STATUS_EVENT, status);
    }
    released
}

#[tauri::command]
pub async fn eye_care_emergency_release(
    app: AppHandle,
    _state: State<'_, Arc<Mutex<AppState>>>,
) -> Result<bool, AppError> {
    Ok(try_emergency_release(&app))
}

#[cfg(test)]
mod tests {
    use super::*;

    fn activity(
        timestamp: i64,
        duration: i64,
        app_name: &str,
        window_title: &str,
        browser_url: Option<&str>,
        ocr_text: Option<&str>,
    ) -> Activity {
        Activity {
            id: None,
            timestamp,
            app_name: app_name.to_string(),
            window_title: window_title.to_string(),
            screenshot_path: String::new(),
            ocr_text: ocr_text.map(ToString::to_string),
            category: "office".to_string(),
            duration,
            browser_url: browser_url.map(ToString::to_string),
            executable_path: None,
            semantic_category: None,
            semantic_confidence: None,
            screenshot_url: None,
        }
    }

    fn config() -> EyeCareConfig {
        EyeCareConfig {
            enabled: true,
            paused: false,
            work_ms: 40_000,
            rest_ms: 3_000,
            input_grace_ms: 2_000,
            natural_rest_ms: 5_000,
            pre_break_ms: 2_000,
        }
    }

    #[test]
    fn active_time_enters_pre_break_then_fixed_rest() {
        let mut runtime = EyeCareRuntime::new(100);
        let cfg = config();
        let before = runtime.tick(37_999, Some(0), false, false, cfg, 137);
        assert!(!before.entered_rest);
        assert_eq!(runtime.phase, EyeCarePhase::Working);
        runtime.tick(1, Some(0), false, false, cfg, 138);
        assert_eq!(runtime.phase, EyeCarePhase::PreBreak);
        let transition = runtime.tick(2_000, Some(0), false, false, cfg, 140);
        assert!(transition.entered_rest);
        assert_eq!(runtime.rest_remaining_ms, 3_000);

        let shorter = EyeCareConfig {
            rest_ms: 1_000,
            ..cfg
        };
        runtime.tick(1_500, Some(0), false, false, shorter, 141);
        assert_eq!(runtime.phase, EyeCarePhase::Resting);
        assert_eq!(runtime.rest_remaining_ms, 1_500);
        assert!(
            runtime
                .tick(1_500, Some(0), false, false, shorter, 143)
                .completed_rest
        );
        assert_eq!(runtime.phase, EyeCarePhase::WaitingReturn);
    }

    #[test]
    fn short_idle_and_lock_pause_but_natural_rest_resets() {
        let mut runtime = EyeCareRuntime::new(100);
        let cfg = config();
        runtime.tick(20_000, Some(0), false, false, cfg, 120);
        runtime.tick(2_000, Some(3_000), false, false, cfg, 122);
        assert_eq!(runtime.accumulated_work_ms, 20_000);
        runtime.tick(2_000, Some(0), true, false, cfg, 124);
        assert_eq!(runtime.accumulated_work_ms, 20_000);

        let reset = runtime.tick(1_000, Some(5_000), false, false, cfg, 125);
        assert!(reset.natural_reset);
        assert_eq!(runtime.accumulated_work_ms, 0);
        runtime.tick(1_000, Some(0), false, false, cfg, 126);
        assert_eq!(runtime.cycle_started_at, 126);
    }

    #[test]
    fn input_grace_counts_reading_before_pausing_this_cycle() {
        let mut runtime = EyeCareRuntime::new(100);
        let cfg = EyeCareConfig {
            work_ms: 600_000,
            input_grace_ms: 60_000,
            natural_rest_ms: 300_000,
            ..config()
        };

        runtime.tick(30_000, Some(30_000), false, false, cfg, 130);
        assert_eq!(runtime.accumulated_work_ms, 30_000);
        assert_eq!(runtime.timer_reason, EyeCareTimerReason::Counting);

        runtime.tick(1_000, Some(60_000), false, false, cfg, 131);
        assert_eq!(runtime.accumulated_work_ms, 30_000);
        assert_eq!(runtime.short_idle_ms, 1_000);
        assert_eq!(runtime.timer_reason, EyeCareTimerReason::ShortIdle);

        runtime.tick(1_000, Some(0), false, false, cfg, 132);
        assert_eq!(runtime.accumulated_work_ms, 31_000);
        assert_eq!(runtime.timer_reason, EyeCareTimerReason::Counting);
    }

    #[test]
    fn natural_rest_waits_for_fresh_input_even_inside_grace_period() {
        let mut runtime = EyeCareRuntime::new(100);
        let cfg = EyeCareConfig {
            work_ms: 600_000,
            input_grace_ms: 60_000,
            natural_rest_ms: 300_000,
            ..config()
        };
        runtime.tick(10_000, Some(0), false, false, cfg, 110);

        assert!(
            runtime
                .tick(1_000, Some(300_000), false, false, cfg, 111)
                .natural_reset
        );
        assert!(runtime.awaiting_fresh_activity);

        runtime.tick(1_000, Some(30_000), false, false, cfg, 112);
        assert_eq!(runtime.accumulated_work_ms, 0);
        assert!(runtime.awaiting_fresh_activity);
        assert_eq!(runtime.timer_reason, EyeCareTimerReason::NaturalRest);

        runtime.tick(1_000, Some(0), false, false, cfg, 113);
        assert_eq!(runtime.accumulated_work_ms, 1_000);
        assert!(!runtime.awaiting_fresh_activity);
    }

    #[test]
    fn lock_or_suspend_uses_natural_rest_threshold_without_counting_gap_as_work() {
        let mut runtime = EyeCareRuntime::new(100);
        let cfg = config();
        runtime.tick(20_000, Some(0), false, false, cfg, 120);
        runtime.tick(3_000, Some(0), true, false, cfg, 123);
        assert_eq!(runtime.accumulated_work_ms, 20_000);
        runtime.tick(2_000, Some(0), true, false, cfg, 125);
        assert_eq!(runtime.accumulated_work_ms, 0);

        runtime.tick(10_000, Some(0), false, false, cfg, 133);
        runtime.tick(8_000, Some(0), false, true, cfg, 141);
        assert_eq!(runtime.accumulated_work_ms, 0);
    }

    #[test]
    fn waiting_return_requires_first_active_input() {
        let mut runtime = EyeCareRuntime::new(100);
        runtime.phase = EyeCarePhase::WaitingReturn;
        assert!(
            !runtime
                .tick(1_000, None, false, false, config(), 101)
                .returned
        );
        assert!(
            !runtime
                .tick(1_000, Some(10_000), false, false, config(), 101)
                .returned
        );
        assert!(
            runtime
                .tick(1_000, Some(0), false, false, config(), 102)
                .returned
        );
        assert_eq!(runtime.phase, EyeCarePhase::Working);
    }

    #[test]
    fn unavailable_input_signal_pauses_without_counting_or_resetting() {
        let mut runtime = EyeCareRuntime::new(100);
        runtime.tick(10_000, Some(0), false, false, config(), 110);
        let transition = runtime.tick(20_000, None, false, false, config(), 130);
        assert_eq!(runtime.accumulated_work_ms, 10_000);
        assert_eq!(transition, EyeCareTransition::default());
    }

    #[test]
    fn diagnostics_separate_counted_and_excluded_time_by_reason() {
        let mut runtime = EyeCareRuntime::new(100);
        let cfg = config();

        runtime.tick(2_000, Some(0), false, false, cfg, 102);
        runtime.tick(1_000, Some(3_000), false, false, cfg, 103);
        runtime.tick(1_000, Some(0), true, false, cfg, 104);
        runtime.tick(1_000, Some(0), false, true, cfg, 105);
        runtime.tick(1_000, None, false, false, cfg, 106);
        runtime.tick(
            1_000,
            Some(0),
            false,
            false,
            EyeCareConfig {
                paused: true,
                ..cfg
            },
            107,
        );

        let status = runtime.status(cfg);
        assert_eq!(status.counted_work_seconds, 2);
        assert_eq!(status.short_idle_seconds, 1);
        assert_eq!(status.locked_seconds, 1);
        assert_eq!(status.suspended_seconds, 1);
        assert_eq!(status.unavailable_seconds, 1);
        assert_eq!(status.paused_seconds, 1);
        assert_eq!(status.excluded_seconds, 5);
        assert_eq!(status.observed_seconds, 7);
        assert_eq!(status.input_idle_seconds, Some(0));
        assert_eq!(status.timer_reason, EyeCareTimerReason::Paused);
        assert!(!status.counting);
        assert_eq!(status.observed_at, 107);
    }

    #[test]
    fn diagnostic_event_history_is_transition_only_and_bounded() {
        let mut runtime = EyeCareRuntime::new(100);
        let cfg = config();
        for index in 0..40 {
            let idle_ms = if index % 2 == 0 { 0 } else { 3_000 };
            runtime.tick(100, Some(idle_ms), false, false, cfg, 101 + index);
        }

        assert_eq!(runtime.diagnostic_events.len(), MAX_DIAGNOSTIC_EVENTS);
        assert_eq!(runtime.diagnostic_events.last().unwrap().occurred_at, 140);
        assert_eq!(
            runtime.diagnostic_events.last().unwrap().reason,
            EyeCareTimerReason::ShortIdle
        );
    }

    #[test]
    fn suspend_aware_clock_detects_sleep_without_using_wall_time() {
        assert_eq!(resolve_tick_timing(1_000, Some(1_010)), (1_010, false));
        assert_eq!(resolve_tick_timing(1_000, Some(181_000)), (181_000, true));
        assert_eq!(resolve_tick_timing(6_000, None), (6_000, true));
    }

    #[test]
    fn paused_or_disabled_pre_break_is_not_shown() {
        let runtime = EyeCareRuntime {
            phase: EyeCarePhase::PreBreak,
            ..EyeCareRuntime::new(100)
        };
        let visible = runtime.status(config());
        assert!(should_show_pre_break(&visible));

        let paused = runtime.status(EyeCareConfig {
            paused: true,
            ..config()
        });
        assert!(!should_show_pre_break(&paused));

        let disabled = runtime.status(EyeCareConfig {
            enabled: false,
            ..config()
        });
        assert!(!should_show_pre_break(&disabled));
    }

    #[test]
    fn wall_clock_rollback_does_not_reduce_saved_rest() {
        let dir = std::env::temp_dir().join(format!("eye-care-{}", uuid::Uuid::new_v4()));
        std::fs::create_dir_all(&dir).unwrap();
        let path = dir.join("state.json");
        let mut runtime = EyeCareRuntime::new(100);
        runtime.phase = EyeCarePhase::Resting;
        runtime.fixed_rest_total_ms = 3_000;
        runtime.rest_remaining_ms = 3_000;
        runtime.save(&path, 100).unwrap();
        let saved_suspend_clock_ms = runtime.saved_suspend_clock_ms;

        // Keep the injected suspend-aware clock fixed. On Windows the real
        // GetTickCount64 advances while the test performs filesystem I/O, which
        // is legitimate runtime behavior but made this wall-clock-only assertion
        // timing-dependent.
        let loaded = EyeCareRuntime::load_or_default_with_clock(
            &path,
            90,
            config(),
            saved_suspend_clock_ms,
            cfg!(windows),
        );
        assert_eq!(loaded.phase, EyeCarePhase::Resting);
        assert_eq!(loaded.rest_remaining_ms, 3_000);
        let _ = std::fs::remove_dir_all(dir);
    }

    #[test]
    fn restart_gap_uses_natural_rest_threshold() {
        let dir = std::env::temp_dir().join(format!("eye-care-{}", uuid::Uuid::new_v4()));
        std::fs::create_dir_all(&dir).unwrap();
        let path = dir.join("state.json");
        let cfg = config();
        let mut runtime = EyeCareRuntime::new(100);
        runtime.tick(20_000, Some(0), false, false, cfg, 120);
        runtime.save(&path, 120).unwrap();

        let before_natural_rest =
            EyeCareRuntime::load_or_default_with_clock(&path, 124, cfg, None, false);
        assert_eq!(before_natural_rest.accumulated_work_ms, 20_000);
        assert!(!before_natural_rest.awaiting_fresh_activity);

        let after_natural_rest =
            EyeCareRuntime::load_or_default_with_clock(&path, 125, cfg, None, false);
        assert_eq!(after_natural_rest.accumulated_work_ms, 0);
        assert!(after_natural_rest.awaiting_fresh_activity);
        assert_eq!(
            after_natural_rest.timer_reason,
            EyeCareTimerReason::NaturalRest
        );
        let _ = std::fs::remove_dir_all(dir);
    }

    #[test]
    fn windows_restart_recovery_uses_boot_clock_and_rejects_wall_time_jumps() {
        assert_eq!(
            trusted_restart_gap_ms(100, 3_700, Some(10_000), Some(11_500), true),
            1_500
        );
        assert_eq!(
            trusted_restart_gap_ms(100, 101, Some(20_000), Some(19_000), true),
            0
        );
        assert_eq!(trusted_restart_gap_ms(100, 3_700, None, None, true), 0);
    }

    #[test]
    fn ocr_tokens_are_deterministic() {
        let mut counts = HashMap::new();
        for token in extract_ocr_tokens("Rust Rust 护眼 2026") {
            *counts.entry(token).or_insert(0) += 1;
        }
        assert_eq!(top_keywords(counts, 3), vec!["rust", "护眼"]);
    }

    #[test]
    fn recap_strictly_clips_cycle_and_reuses_privacy_filters() {
        let activities = vec![
            activity(
                110,
                20,
                "Code",
                "main.rs",
                Some("https://github.com/example/repo"),
                Some("Rust Rust"),
            ),
            activity(120, 10, "Secret App", "private", None, Some("secret")),
            activity(
                130,
                10,
                "Browser",
                "excluded",
                Some("https://private.example/page"),
                Some("hidden"),
            ),
            activity(135, 5, "Work Review", "Work Review", None, Some("self")),
            // 这条在 break_start 之后落库，但区间 125..145 与本轮重叠 15 秒。
            activity(145, 20, "Code", "main.rs", None, Some("Rust")),
            // 脱敏活动仍保留应用与时长，但没有标题、URL 或 OCR 可供回顾。
            activity(138, 5, "Private App", "[内容已脱敏]", None, None),
        ];
        let filtered = crate::commands::filter_activities_by_privacy(
            activities,
            &["secret app".to_string()],
            &["private.example".to_string()],
        );
        let recap = build_recap_from_activities(filtered, 100, 140);

        assert_eq!(recap.total_duration_seconds, 30);
        assert_eq!(
            recap.top_apps,
            vec![
                EyeCareUsageItem {
                    name: "Code".to_string(),
                    duration_seconds: 25,
                },
                EyeCareUsageItem {
                    name: "Private App".to_string(),
                    duration_seconds: 5,
                },
            ]
        );
        assert_eq!(
            recap.top_websites,
            vec![EyeCareUsageItem {
                name: "github.com".to_string(),
                duration_seconds: 10,
            }]
        );
        assert_eq!(recap.ocr_keywords, vec!["rust"]);
        assert!(!recap.empty);
    }
}
