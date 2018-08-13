const fs = require('fs');
const nxml = require('./index');

var xg = new nxml.XMLObjectGetter('stream');
xg.onelem = () => {
  console.log(xg.stream[0]);
  xg.stream.shift();
}
xg.onend = () => {
  console.log('end');
}
xg.write(fs.readFileSync('./test.xml'));