# Phantom Crawler

Phantom 2.0 / SlimerJS-based spider.

Run by phantom.sh / slimer.sh.

Crawls and looks for broken links and js errors. Reports.

Call `phantom.sh / slimer.hs`.

Both slimerjs/phantomjs are very buggy. This thing works though.

But they are very buggy, can die on a page, problems with handling redirects, js errors get swallowed in callbacks, making things hard to debug, phantom has a problem with SNI OpenSSL (cloudflare sites) etc etc etc. 

So use carefully, and fix/improve in the future, if the tools evolve.
