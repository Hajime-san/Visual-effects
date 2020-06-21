const fs = require('fs');

const baseDir = 'examples/';
const pattern = /index.html/;

const space = ' ';
const parameter = process.argv[2];

let script = '';

switch (parameter) {
  case 's':
    script = 'start'
    break;
  case 'b':
    script = 'build'
      break;
  default:
    script = ''
    break;
}

const Targets = fs.readdirSync(baseDir).filter(dirName => !pattern.test(dirName));

for(let i = 0; i < Targets.length; i += 1){
  console.log(`TARGET_PATH=${baseDir}${Targets[i]} yarn${space}${script}`);
}
