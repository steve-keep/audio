// app/logger.ts

interface LogEntry {
  timestamp: string;
  message: string;
}

const logs: LogEntry[] = [];

function getTimestamp(): string {
  return new Date().toISOString();
}

export function addLog(message: string): void {
  const newLog: LogEntry = {
    timestamp: getTimestamp(),
    message: message,
  };
  logs.push(newLog);
  // Optional: Keep the log size manageable
  if (logs.length > 1000) {
    logs.shift(); // Remove the oldest log
  }
}

export function getLogs(): LogEntry[] {
  return [...logs];
}

export function exportLogsAsText(): string {
  return logs
    .map((log) => `${log.timestamp} - ${log.message}`)
    .join("\n");
}

export function clearLogs(): void {
  logs.length = 0;
}
