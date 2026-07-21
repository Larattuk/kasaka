#!/usr/bin/env node
var http = require('http');
var fs = require('fs');
var path = require('path');

var PORT = Number(process.env.PORT || 8787);
var HOST = process.env.HOST || '0.0.0.0';
var APP_DIR = process.env.POS_APP_DIR || path.join(__dirname, '..', 'app');
var DATA_FILE = process.env.POS_DATA_FILE || path.join(__dirname, 'pos-data.json');

function defaultData() { return { db: {}, archiveChecks: [], config: {} }; }
function readData() { try { return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); } catch (e) { return defaultData(); } }
function writeData(data, done) { fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2), 'utf8', done); }
function send(res, status, body, type) { res.writeHead(status, {'Content-Type': type || 'application/json; charset=utf-8','Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'GET,POST,OPTIONS','Access-Control-Allow-Headers':'Content-Type'}); res.end(body); }
function readBody(req, done) { var raw=''; req.on('data', function(c){ raw+=c; if(raw.length>1024*1024) req.destroy(); }); req.on('end', function(){ done(raw); }); }

http.createServer(function(req,res){
  var url = req.url.split('?')[0];
  if(req.method==='OPTIONS'){ send(res,204,''); return; }
  if(url==='/' || url==='/index.html' || url==='/kasa-pos-new.html'){
    var file = url==='/kasa-pos-new.html' ? 'kasa-pos-new.html' : 'index.html';
    fs.readFile(path.join(APP_DIR,file),'utf8',function(err,html){ if(err){ send(res,500,'App file not found: '+file,'text/plain; charset=utf-8'); return; } send(res,200,html,'text/html; charset=utf-8'); });
    return;
  }
  if(url==='/pos-data' && req.method==='GET'){ send(res,200,JSON.stringify(readData())); return; }
  if(url==='/pos-data' && req.method==='POST'){
    readBody(req,function(raw){ var incoming; try{ incoming=JSON.parse(raw||'{}'); }catch(e){ send(res,400,JSON.stringify({error:'Bad JSON'})); return; }
      var data={ db: incoming.db || {}, archiveChecks: incoming.archiveChecks || [], config: incoming.config || {} };
      writeData(data,function(err){ if(err){ send(res,500,JSON.stringify({error:'Cannot save data'})); return; } send(res,200,JSON.stringify({ok:true, savedTo: DATA_FILE})); });
    });
    return;
  }
  send(res,404,'Not found','text/plain; charset=utf-8');
}).listen(PORT,HOST,function(){ console.log('POS server: http://'+HOST+':'+PORT); console.log('App folder: '+APP_DIR); console.log('Data file: '+DATA_FILE); });
