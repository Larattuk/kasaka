#!/usr/bin/env node
var http = require('http');
var fs = require('fs');
var path = require('path');

var PORT = Number(process.env.PORT || 8787);
var HOST = process.env.HOST || '0.0.0.0';
var DATA_FILE = process.env.POS_DATA_FILE || path.join(__dirname, 'pos-data.json');

function readData() {
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  } catch (e) {
    return { db: {}, archiveChecks: [], config: {} };
  }
}

function writeData(data, done) {
  fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2), 'utf8', done);
}

function send(res, status, body, type) {
  res.writeHead(status, {
    'Content-Type': type || 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  });
  res.end(body);
}

http.createServer(function(req, res) {
  if (req.method === 'OPTIONS') {
    send(res, 204, '');
    return;
  }

  if (req.url === '/' || req.url === '/index.html' || req.url === '/kasa-pos-new.html') {
    var page = req.url === '/kasa-pos-new.html' ? 'kasa-pos-new.html' : 'index.html';
    fs.readFile(path.join(__dirname, page), 'utf8', function(err, html) {
      if (err) { send(res, 500, page + ' not found', 'text/plain; charset=utf-8'); return; }
      send(res, 200, html, 'text/html; charset=utf-8');
    });
    return;
  }

  if (req.url === '/pos-data' && req.method === 'GET') {
    send(res, 200, JSON.stringify(readData()));
    return;
  }

  if (req.url === '/pos-data' && req.method === 'POST') {
    var raw = '';
    req.on('data', function(chunk) { raw += chunk; if (raw.length > 1024 * 1024) { req.destroy(); } });
    req.on('end', function() {
      var data;
      try { data = JSON.parse(raw || '{}'); } catch (e) { send(res, 400, JSON.stringify({ error: 'Bad JSON' })); return; }
      writeData(data, function(err) {
        if (err) { send(res, 500, JSON.stringify({ error: 'Cannot save data' })); return; }
        send(res, 200, JSON.stringify({ ok: true }));
      });
    });
    return;
  }

  send(res, 404, 'Not found', 'text/plain; charset=utf-8');
}).listen(PORT, HOST, function() {
  console.log('POS server: http://' + HOST + ':' + PORT);
  console.log('Data file: ' + DATA_FILE);
});
