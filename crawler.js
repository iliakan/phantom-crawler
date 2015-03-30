var helpers = require('./lib/helpers');
var webPage = require('webpage');
var assert = require('./lib/assert');
var log = require('./lib/log');

function Crawler(config) {

  // Visited urls, not to visit them twice
  var visitedUrls = {};

  // A list of urls waiting for a visit
  var pendingUrls = [config.startUrl];

  // A map of referers
  var refUrls = {};

  var page;

  // Current page url
  // Same as page.url, but page.url is set after open finishes
  // This variable is set before page.open and can be used while resource are being loaded
  var url;

  function onResourceReceived(resource) {
    // sometimes stage 'end' may contain no url, only time & id
    // sometimes stage 'start is absent

    /*
    delete resource.body;
    log(JSON.stringify(resource));
    */

    if (!resource.status) return;

    log("onResourceReceived", resource.id, resource.url);

    visitedUrls[resource.url].status = resource.status;

    if ((resource.status == 301 || resource.status == 302) &&
      resource.redirectURL  // redirectURL === Location header
    ) {
      log("onResourceReceived redirect to", resource.redirectURL);
      saveRef(url, resource.redirectUrl);
      // sometimes redirects are not followed
      if (!~pendingUrls.indexOf(resource.redirectURL)) {
        pendingUrls.push(resource.redirectURL);
      }
    }
  }

  // Page requests resources, but also requests it's own url,
  function onResourceRequested(requestData, networkRequest) {
    log("onResourceRequested", requestData.id, requestData.url);

    // if skip function doesn't like resource url, skip it
    if (config.getCrawlMode(requestData.url) == 'skip') {
      log("onResourceRequested: skip", requestData.url);
      networkRequest.abort();
      return;
    }

    // skip the resource request for this page, cause it has 'status' check only
    // the same resource may be needed from other pages in 'follow' status
    // so don't mark it visited
    if (page.crawlMode == 'status' && requestData.url != url) {
      log("onResourceRequested: skip status only", requestData.url);
      networkRequest.abort();
      return;
    }

    saveRef(url, requestData.url);

    // we do not skip visited resources, because they are needed for page
    // page must load and work, all js is needed for that

    // one url may be visited many times if a resource is re-requested
    visitedUrls[requestData.url] = {};
  }

  function onError(msg, trace) {
    var error = {
      msg:  msg,
      file: trace[0].file,
      line: trace[0].line,
      func: trace[0]['function'],
      url:  url
    };

    log('ERROR: ' + error.msg);
    log('file: ' + error.file);
    log('line: ' + error.line);
    log('function: ' + error.func);

    saveError(url, error);
  }

  var timeoutRetryCount = {};

  function onResourceError(error) {
    if (error.errorCode == 301 && !error.url) {
      // resource aborted in phantomjs, not slimerjs gives such errors
      return;
    }

    if (error.errorCode == 408) {
      // timeout => retry
      if (!timeoutRetryCount[error.url]) {
        timeoutRetryCount[error.url] = 1;
      }
      if (timeoutRetryCount[error.url] <= 3) {
        log("onResourceError retry timeout");
        delete visitedUrls[error.url];
        if (!~pendingUrls.indexOf(error.url)) {
          pendingUrls.push(error.url);
        }
        timeoutRetryCount[error.url]++;
        return;
      }
    }

    if (error.errorCode == 99 || error.errorCode == 95) {
      // aborted (skipped)
      log("onResourceError aborted", error.url);
      return;
    }

    log(JSON.stringify(error));
    log("onResourceError error " + error.errorCode + "[" + error.errorString + "]" + " " + error.url + " from " + url);

    saveError(error.url, error);
  }

  function visitPendingUrl() {

    url = pendingUrls.shift();

    if (!url) {
      log("visitPendingUrl found no more urls to visit");
      config.onComplete(visitedUrls, refUrls);
      return;
    }

    // Mark the URL as visited
    // Do it before the actual visit,
    // so links to the same url during the visit will not be queued
    // visitedUrls[url] = {};

    log("visitPendingUrl got " + url + ", mode: " + config.getCrawlMode(url));

    if (page) page.close();

    log("visitPendingUrl create page " + url);

    page = webPage.create();

    page.settings.resourceTimeout = 5000;

    page.crawlMode = config.getCrawlMode(url);

    if (page.crawlMode == 'status') {
      // check existence only, no resources/js please
      page.settings.javascriptEnabled = false;
      page.settings.loadImages = false;
    }

    page.onResourceReceived = onResourceReceived;


    page.onResourceRequested = onResourceRequested;

    page.onError = onError;

    page.onResourceError = onResourceError;
    page.onResourceTimeout = onResourceError;
/*
    page.onNavigationRequested = function(url, type, willNavigate, main) {
      console.log('Trying to navigate to: ' + url);
      console.log('Caused by: ' + type);
      console.log('Will actually navigate: ' + willNavigate);
      console.log('Sent from the page\'s main frame: ' + main);
    };*/

    page.onLoadFinished = function(status) {

      if (status == 'fail') {
        /* network error occured or the request was aborted.
         Both cases are handled in onResourceError
         */
        log("visitPendingUrl failed", url);
        visitPendingUrl();
        return;
      }

      log("visitPendingUrl opened", url);

      if (page.crawlMode == 'status') {
        visitPendingUrl();
        return;
      }

      // page may come here with status 404 or 500, but not a network error

      // check page content
      var inPageErrors = page.evaluate(function() {
        return [].map.call(document.querySelectorAll('.format_error'), function(elem) {
          return elem.innerHTML;
        });
      });

      if (inPageErrors.length) {
        var error = {
          pageErrors: inPageErrors
        };

        saveError(url, error);
        log('In-page errors:', inPageErrors);
      }


      // Find links on the current page
      var localLinks = helpers.findLinks(page);
      log("SPIDER FOUND LINKS ", localLinks);

      // Process Links on Page
      var baseUrl = page.evaluate(function() {
        return window.location.href;
      });

      // iterate through each link
      localLinks.forEach(function(link) {

        // Get absolute url
        var newUrl = helpers.absoluteUri(baseUrl, link);

        //log("Baseurl", baseUrl, "link", link);

        saveRef(url, newUrl);

        if (pendingUrls.indexOf(newUrl) === -1 && !visitedUrls[newUrl]) {

          if (config.getCrawlMode(newUrl) != 'skip') {

            log('Pending added', newUrl);

            pendingUrls.push(newUrl);

          } else {
            log('Skipping', newUrl);
          }
        }
      });

      log("visitPendingUrl complete " + url);
      log("--------");

      visitPendingUrl();

    };

    page.open(url);

  }


  function saveRef(from, to) {
    if (from == to) return;
    //log(new Error().stack);
    log("saveRef", from, to);
    if (!refUrls[from]) {
      refUrls[from] = [];
    }
    if (!~refUrls[from].indexOf(to)) {
      refUrls[from].push(to);
    }
  }

  function saveError(url, error) {
    if (!visitedUrls[url].errors) {
      visitedUrls[url].errors = [];
    }
    visitedUrls[url].errors.push(error);
  }


  /*
   function _onComplete() {

   log('Crawl has completed!');

   dataObj.errUrls = [];

   for (var url in visitedUrls) {
   var status = visitedUrls[url];
   if (status >= 400) {

   dataObj.errUrls.push({
   url:    url,
   status: status,
   refs:   helpers.uniqueStrings(refUrls[url])
   });
   }

   }

   dataObj.resourceErrorsByRef = resourceErrorsByRef;

   var data = JSON.stringify(dataObj, undefined, 2);

   // write json file
   fs.write(config.logFilePath, data, 'w');

   log('Data file can be found at ' + config.logFilePath + '.');
   phantom.exit();
   }*/

  this.start = function() {
    visitPendingUrl();
  };
}

module.exports = Crawler;