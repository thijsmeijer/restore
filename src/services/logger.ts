type LogValue = boolean | number | string | null;
type LogProperties = Readonly<Record<string, LogValue>>;

type LogEntry = {
  level: 'debug' | 'info' | 'warn' | 'error';
  event: string;
  timestamp: string;
  properties?: LogProperties;
};

function write(entry: LogEntry) {
  const serialized = JSON.stringify(entry);

  switch (entry.level) {
    case 'debug':
      console.debug(serialized);
      return;
    case 'info':
      console.info(serialized);
      return;
    case 'warn':
      console.warn(serialized);
      return;
    case 'error':
      console.error(serialized);
  }
}

function entry(
  level: LogEntry['level'],
  event: string,
  properties?: LogProperties,
) {
  write({
    level,
    event,
    timestamp: new Date().toISOString(),
    ...(properties ? { properties } : {}),
  });
}

export const logger = {
  debug: (event: string, properties?: LogProperties) =>
    entry('debug', event, properties),
  info: (event: string, properties?: LogProperties) =>
    entry('info', event, properties),
  warn: (event: string, properties?: LogProperties) =>
    entry('warn', event, properties),
  error: (event: string, properties?: LogProperties) =>
    entry('error', event, properties),
};
