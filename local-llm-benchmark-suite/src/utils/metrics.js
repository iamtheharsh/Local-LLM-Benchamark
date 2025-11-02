// Utility functions for collecting and processing system metrics

export function getSystemMetrics() {
  // Placeholder for system metrics collection
  // This will be implemented in Phase 4
  return {
    cpu: 0,
    memory: 0,
    battery: 0,
    timestamp: Date.now()
  };
}

export function formatBytes(bytes) {
  // Format bytes to human readable format
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

export function calculateAverage(values) {
  if (values.length === 0) return 0;
  const sum = values.reduce((acc, val) => acc + val, 0);
  return sum / values.length;
}
