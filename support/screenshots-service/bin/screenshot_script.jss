var system = require('system');
var env = system.env;
var page = require('webpage').create();
page.viewportSize = { width: 740, height: 740 };
//page.zoomFactor = 0.20;
//page.clipRect = { top: 0, left: 0, width: 1280, height: 1280 };
page.clipRect = {top:0, left:0, width:740, height:1024};

var url = env.URL;
var filePath = env.FILEPATH;

console.log(url);
console.log(filePath);

page.open(url, function() {
  page.render(filePath);
  phantom.exit();
});