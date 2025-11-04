#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use std::collections::HashMap;
use sysinfo::System;

type MetricsHistory = Mutex<Vec<(std::time::Instant, SystemMetrics)>>;

#[derive(Serialize, Deserialize, Clone)]
pub struct SystemMetrics {
    pub memory_used: f64,
    pub memory_total: f64,
    pub memory_percentage: f64,
    pub cpu_usage: f64,
    pub cpu_count: usize,
    pub load_average: f64,
    pub battery_level: Option<f64>,
    pub battery_time_remaining: Option<String>,
    pub battery_state: String,
    pub disk_usage: Vec<DiskInfo>,
    pub temperature: Option<f64>,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct DiskInfo {
    pub name: String,
    pub total: u64,
    pub available: u64,
    pub used_percentage: f64,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct StorageData {
    pub key: String,
    pub value: String,
    pub timestamp: u64,
}

#[derive(Serialize, Deserialize)]
pub struct FileInfo {
    pub name: String,
    pub path: String,
    pub size: u64,
    pub is_directory: bool,
    pub modified: u64,
}

#[tauri::command]
async fn get_system_metrics() -> Result<SystemMetrics, String> {
    let mut sys = System::new_all();
    sys.refresh_all();

    // Memory metrics (GB)
    let memory_used = sys.used_memory() as f64 / (1024.0 * 1024.0 * 1024.0);
    let memory_total = sys.total_memory() as f64 / (1024.0 * 1024.0 * 1024.0);
    let memory_percentage = (memory_used / memory_total) * 100.0;

    // CPU metrics (simplified for sysinfo 0.30)
    // In a real implementation, you'd track CPU usage over time
    let cpu_usage = 0.0; // Placeholder - real implementation would track CPU usage
    let cpu_count = sys.physical_core_count().unwrap_or(1);
    let load_average = 0.0; // Simplified for sysinfo 0.30

    // Disk metrics (simplified for sysinfo 0.30)
    let mut disk_usage = Vec::new();

    // Add a default disk entry for macOS/Linux
    #[cfg(any(target_os = "macos", target_os = "linux"))]
    {
        disk_usage.push(DiskInfo {
            name: "Main Disk".to_string(),
            total: sys.total_memory() * 4, // Estimate based on memory
            available: sys.available_memory(),
            used_percentage: 50.0, // Placeholder
        });
    }

    // Battery metrics (simplified for sysinfo 0.30)
    let mut battery_level: Option<f64> = None;
    let mut battery_time_remaining: Option<String> = None;
    let mut battery_state = "Unavailable".to_string();

    // Temperature (if available via sysinfo 0.30)
    let mut temperature: Option<f64> = None;

    Ok(SystemMetrics {
        memory_used,
        memory_total,
        memory_percentage,
        cpu_usage,
        cpu_count,
        load_average,
        battery_level,
        battery_time_remaining,
        battery_state,
        disk_usage,
        temperature,
    })
}

#[tauri::command]
async fn read_file(path: String) -> Result<String, String> {
    std::fs::read_to_string(path)
        .map_err(|e| format!("Failed to read file: {}", e))
}

#[tauri::command]
async fn write_file(path: String, content: String) -> Result<(), String> {
    std::fs::write(path, content)
        .map_err(|e| format!("Failed to write file: {}", e))
}

#[tauri::command]
async fn list_directory(path: String) -> Result<Vec<FileInfo>, String> {
    let entries = std::fs::read_dir(path)
        .map_err(|e| format!("Failed to read directory: {}", e))?;

    let mut files = Vec::new();
    for entry in entries {
        let entry = entry.map_err(|e| format!("Failed to read entry: {}", e))?;
        let metadata = entry.metadata()
            .map_err(|e| format!("Failed to get metadata: {}", e))?;

        files.push(FileInfo {
            name: entry.file_name().to_string_lossy().to_string(),
            path: entry.path().to_string_lossy().to_string(),
            size: metadata.len(),
            is_directory: metadata.is_dir(),
            modified: metadata.modified()
                .map(|t| t.duration_since(std::time::UNIX_EPOCH).unwrap_or_default().as_secs())
                .unwrap_or(0),
        });
    }

    Ok(files)
}

#[tauri::command]
async fn store_data(key: String, value: String) -> Result<(), String> {
    let data_dir = dirs::data_dir()
        .unwrap_or_else(|| std::path::PathBuf::from("."))
        .join("local-llm-benchmark-suite");

    std::fs::create_dir_all(&data_dir)
        .map_err(|e| format!("Failed to create data directory: {}", e))?;

    // Simple file-based storage
    let storage_file = data_dir.join("storage.json");
    let mut storage: HashMap<String, StorageData> =
        if storage_file.exists() {
            let content = std::fs::read_to_string(&storage_file)
                .map_err(|e| format!("Failed to read storage: {}", e))?;
            serde_json::from_str(&content)
                .unwrap_or_default()
        } else {
            HashMap::new()
        };

    let timestamp = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs();

    storage.insert(key.clone(), StorageData { key, value, timestamp });

    let content = serde_json::to_string_pretty(&storage)
        .map_err(|e| format!("Failed to serialize storage: {}", e))?;

    std::fs::write(&storage_file, content)
        .map_err(|e| format!("Failed to write storage: {}", e))
}

#[tauri::command]
async fn retrieve_data(key: String) -> Result<Option<StorageData>, String> {
    let data_dir = dirs::data_dir()
        .unwrap_or_else(|| std::path::PathBuf::from("."))
        .join("local-llm-benchmark-suite");

    let storage_file = data_dir.join("storage.json");

    if !storage_file.exists() {
        return Ok(None);
    }

    let content = std::fs::read_to_string(&storage_file)
        .map_err(|e| format!("Failed to read storage: {}", e))?;

    let storage: HashMap<String, StorageData> = serde_json::from_str(&content)
        .map_err(|e| format!("Failed to parse storage: {}", e))?;

    Ok(storage.get(&key).cloned())
}

#[tauri::command]
async fn get_storage_keys() -> Result<Vec<String>, String> {
    let data_dir = dirs::data_dir()
        .unwrap_or_else(|| std::path::PathBuf::from("."))
        .join("local-llm-benchmark-suite");

    let storage_file = data_dir.join("storage.json");

    if !storage_file.exists() {
        return Ok(Vec::new());
    }

    let content = std::fs::read_to_string(&storage_file)
        .map_err(|e| format!("Failed to read storage: {}", e))?;

    let storage: HashMap<String, StorageData> = serde_json::from_str(&content)
        .map_err(|e| format!("Failed to parse storage: {}", e))?;

    Ok(storage.keys().cloned().collect())
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            get_system_metrics,
            read_file,
            write_file,
            list_directory,
            store_data,
            retrieve_data,
            get_storage_keys
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
