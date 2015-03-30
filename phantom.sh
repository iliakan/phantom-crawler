#!/bin/bash

phantomjs --ssl-protocol=any --disk-cache=yes --ignore-ssl-errors=yes --max-disk-cache-size=1000000 run.js
