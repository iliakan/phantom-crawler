exports.uniqueStrings = function(arr) {
  var stringSet = {}, result = [];
  for (var i = 0; i < arr.length; i++) {
    stringSet[arr[i]] = true;
  }
  return Object.keys(stringSet);
};


// Turn a (possibly) relative URI into a full RFC 3986-compliant URI
// With minor modifications, courtesy: https://gist.github.com/Yaffle/1088850
exports.absoluteUri = function(base, href) {

  // Parse a URI and return its constituent parts
  function parseUri(url) {
    var match = String(url).replace(/^\s+|\s+$/g, '').match(/^([^:\/?#]+:)?(\/\/(?:[^:@]*(?::[^:@]*)?@)?(([^:\/?#]*)(?::(\d*))?))?([^?#]*)(\?[^#]*)?(#[\s\S]*)?/);
    return (match ? {
      href:      match[0] || '',
      protocol:  match[1] || '',
      authority: match[2] || '',
      host:      match[3] || '',
      hostname:  match[4] || '',
      port:      match[5] || '',
      pathname:  match[6] || '',
      search:    match[7] || '',
      hash:      match[8] || ''
    } : null);
  }

  // Resolve dots in the path
  function resolvePathDots(input) {
    var output = [];
    input.replace(/^(\.\.?(\/|$))+/, '')
      .replace(/\/(\.(\/|$))+/g, '/')
      .replace(/\/\.\.$/, '/../')
      .replace(/\/?[^\/]*/g, function(part) {
        part === '/..' ? output.pop() : output.push(part);
      });
    return output.join('').replace(/^\//, input.charAt(0) === '/' ? '/' : '');
  }

  // Parse base and href
  href = parseUri(href || '');
  base = parseUri(base || '');

  // Build and return the URI
  return !href || !base ? null : (href.protocol || base.protocol) +
  (href.protocol || href.authority ? href.authority : base.authority) +
  (resolvePathDots(href.protocol || href.authority || href.pathname.charAt(0) === '/' ? href.pathname : (href.pathname ? ((base.authority && !base.pathname ? '/' : '') + base.pathname.slice(0, base.pathname.lastIndexOf('/') + 1) + href.pathname) : base.pathname))) +
  (href.protocol || href.authority || href.pathname ? href.search : (href.search || base.search)) + href.hash;

};


// Find links on the current page
exports.findLinks = function(page) {
  return page.evaluate(function() {
    var links = [];

    [].forEach.call(document.querySelectorAll('a[href]:not([href^="javascript:"])'), function(e) {
      links.push(e.getAttribute('href'));
    });

    [].forEach.call(document.querySelectorAll('iframe'), function(e) {
      links.push(e.getAttribute('src'));
    });

    links = links.filter(Boolean).map(function(url) {
      return url.replace(/#.*$/, '');
    });

    return links;
  });
};