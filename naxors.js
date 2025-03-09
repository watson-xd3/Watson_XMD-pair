const path = require('path');
const { setupMaster, fork } = require('cluster');
const { watchFile, unwatchFile } = require('fs');
const cfonts = require('cfonts');
const readline = require('readline');
const yargs = require('yargs');
const __dirname = path.dirname(__filename); 
const { say } = cfonts;
const rl = readline.createInterface(process.stdin, process.stdout);

say('WatsonFourpence', {
  font: 'pallet',
  align: 'center',
  gradient: ['red', 'magenta'],
});
say('pair', {
  font: 'console',
  align: 'center',
  gradient: ['cyan', 'magenta'],
});

var isRunning = false;

/**
 * Start a JS file
 * @param {String} file 
 */
function start(file) {
  if (isRunning) return;
  isRunning = true;
  let args = [path.join(__dirname, file), ...process.argv.slice(2)];
  say([process.argv[0], ...args].join(' '), {
    font: 'console',
    align: 'center',
    gradient: ['red', 'magenta'],
  });

  setupMaster({
    exec: args[0],
    args: args.slice(1),
  });

  let p = fork();
  p.on('message', data => {
    console.log('[RECEIVED]', data);
    switch (data) {
      case 'reset':
        p.process.kill();
        isRunning = false;
        start(file); 
        break;
      case 'uptime':
        p.send(process.uptime());
        break;
    }
  });

  p.on('exit', (_, code) => {
    isRunning = false;
    console.error('❎ An Error occurred:', code);
    if (code === 0) return;
    watchFile(args[0], () => {
      unwatchFile(args[0]);
      start(file);
    });
  });

  let opts = yargs(process.argv.slice(2)).exitProcess(false).parse();
  if (!opts['test']) {
    if (!rl.listenerCount())
      rl.on('line', line => {
        p.emit('message', line.trim());
      });
  }
}

start('webs-pair.js');
  
