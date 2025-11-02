#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde::{Deserialize, Serialize};
use sysinfo::System;

#[derive(Serialize, Deserialize)]
pub struct SystemMetrics {
    pub memory_used: f64,
    pub memory_total: f64,
    pub memory_percentage: f64,
    pub cpu_usage: f64,
    pub cpu_count: usize,
    pub battery_level: Option<f64>,
    pub battery_time_remaining: Option<String>,
    pub battery_state: String,
}

#[tauri::command]
async fn get_system_metrics() -> Result<SystemMetrics, String> {
    let mut sys = System::new_all();

    // Refresh all system information
    sys.refresh_all();

    // Memory metrics
    let memory_used = sys.used_memory() as f64 / (1024.0 * 1024.0 * 1024.0); // Convert to GB
    let memory_total = sys.total_memory() as f64 / (1024.0 * 1024.0 * 1024.0); // Convert to GB
    let memory_percentage = (memory_used / memory_total) * 100.0;

    // CPU metrics
    sys.refresh_cpu();
    // In sysinfo 0.30, we need to check CPU usage differently
    // For now, return a placeholder - will be updated based on actual API
    let cpu_usage = 0.0;
    let cpu_count = sys.physical_core_count().unwrap_or(1);

    // Battery metrics (macOS/Linux only - will return None on Windows)
    let mut battery_level: Option<f64> = None;
    let mut battery_time_remaining: Option<String> = None;
    let mut battery_state = "Unavailable".to_string();

    #[cfg(any(target_os = "macos", target_os = "linux"))]
    {
        // Battery API changed in sysinfo 0.30
        // For now, we'll keep it simple and return None
        // Future enhancement: implement proper battery monitoring
    }

    Ok(SystemMetrics {
        memory_used,
        memory_total,
        memory_percentage,
        cpu_usage,
        cpu_count,
        battery_level,
        battery_time_remaining,
        battery_state,
    })
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![get_system_metrics])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
