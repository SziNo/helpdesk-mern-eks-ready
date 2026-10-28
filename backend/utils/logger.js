// Egyszerű, függőség nélküli logger.
// Konténer környezetben minden log a stdout-ra / stderr-re megy, soronként egy
// JSON objektumként, így a log gyűjtő (pl. CloudWatch, Fluent Bit) könnyen
// fel tudja dolgozni.

const write = (level, message, meta = {}) => {
  const line = JSON.stringify({
    time: new Date().toISOString(),
    level,
    message,
    ...meta,
  })
  if (level === 'error') {
    process.stderr.write(line + '\n')
  } else {
    process.stdout.write(line + '\n')
  }
}

module.exports = {
  info: (message, meta) => write('info', message, meta),
  warn: (message, meta) => write('warn', message, meta),
  error: (message, meta) => write('error', message, meta),
}
