
var fs = require('fs');

var config = {
  startUrl:     'http://127.0.0.1:8080/single-page/',

  // for an url return:
  // analyze => to fetch it and it's content and gather links
  // status => to check it's HTTP-status only
  // skip => don't load at all
  getCrawlMode: function(url) {
    return 'analyze';
  },

  onComplete: onComplete,

  logFilePath: fs.workingDirectory + '/log.json'

};

phantom.onError = function(msg, trace) {
  var msgStack = ['PHANTOM ERROR: ' + msg];
  //console.log(JSON.stringify(trace));
  if (trace && trace.length) {
    msgStack.push('TRACE:');
    trace.forEach(function(t) {
      msgStack.push(' -> ' + (t.file || t.sourceURL) + ': ' + t.line + (t.function ? ' (in function ' + t.function +')' : ''));
    });
  }
  console.log(msgStack.join('\n'));
  phantom.exit(1);
};

function onComplete(visitedUrls, refUrls) {
  console.log(JSON.stringify(visitedUrls, 4));
  console.log(JSON.stringify(refUrls, 4));
  phantom.exit();
}

var Crawler = require('../../crawler');

var crawler = new Crawler(config);
crawler.start();
