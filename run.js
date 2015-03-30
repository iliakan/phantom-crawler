
var fs = require('fs');
var Crawler = require('./crawler');

var config = {
  startUrl:     'http://javascript.in/',

  // for an url return:
  // analyze => to fetch it and it's content and gather links
  // status => to check it's HTTP-status only
  // skip => don't load at all
  getCrawlMode: function(url) {

    // phantomjs dies on it
    if (~url.indexOf('habrahabr.ru/post/141451')) return 'skip';

    if (~url.indexOf('disqus.')) return 'skip';

    // mocha test sublinks
    if (~url.indexOf('?grep')) return 'skip';
    if (~url.indexOf('fonts.googleapis.com')) return 'skip';
    if (~url.indexOf('plnkr.co/')) return 'skip';
    // optional 2x images
    if (~url.indexOf('@2x')) return 'skip';
    // share links
    if (/twitter.com|facebook.com|google.com|vkontakte.ru/.test(url)) return 'skip';

    if (~url.indexOf('javascript.in')) {
      return 'analyze';
    }

    return 'status';

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
  console.log("--> visitedUrls");
  fs.write("out/visited.json", JSON.stringify(visitedUrls, null, 2));
  console.log("--> refUrls");
  fs.write("out/refs.json", JSON.stringify(refUrls, null, 2));

  // refUrls: from->to
  // flip it
  // refsBack: to->from
  var refsBack = {};
  for (var from in refUrls) {
    for (var i = 0; i < refUrls[from].length; i++) {
      var to = refUrls[from][i];
      if (!refsBack[to]) refsBack[to] = [];
      refsBack[to].push(from);
    }
  }

  // filter only visitedUrls with errors
  var errorUrls = {};
  for (var url in visitedUrls) {
    if (visitedUrls[url].errors || visitedUrls[url].status >= 400) {
      errorUrls[url] = visitedUrls[url]
      errorUrls[url].refs = refsBack[url];
    }
  }

  console.log("--> errorUrls");
  fs.write("out/errors.json", JSON.stringify(errorUrls, null, 2));

  phantom.exit();
}

var crawler = new Crawler(config);
crawler.start();
