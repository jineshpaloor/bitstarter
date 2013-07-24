#!/usr/bin/env node
/*
Automatically grade files for the presence of specified HTML tags/attributes.
Uses commander.js and cheerio. Teaches command line application development
and basic DOM parsing.

References:

 + cheerio
   - https://github.com/MatthewMueller/cheerio
   - http://encosia.com/cheerio-faster-windows-friendly-alternative-jsdom/
   - http://maxogden.com/scraping-with-node.html

 + commander.js
   - https://github.com/visionmedia/commander.js
   - http://tjholowaychuk.com/post/9103188408/commander-js-nodejs-command-line-interfaces-made-easy

 + JSON
   - http://en.wikipedia.org/wiki/JSON
   - https://developer.mozilla.org/en-US/docs/JSON
   - https://developer.mozilla.org/en-US/docs/JSON#JSON_in_Firefox_2
*/

var fs = require('fs');
var sys = require('sys');
var program = require('commander');
var cheerio = require('cheerio');
var rest = require('restler');
var HTMLFILE_DEFAULT = "index.html";
var URL_DEFAULT = "https://enigmatic-garden-9511.herokuapp.com/";
var CHECKSFILE_DEFAULT = "checks.json";
var URL_HTML = "home.html";

var assertFileExists = function(infile) {
    var instr = infile.toString();
    if(!fs.existsSync(instr)) {
        process.exit(1); // http://nodejs.org/api/process.html#process_process_exit_code
    }
    return instr;
};

var assertHtmlExists = function(inurl) {
    rest.get(inurl).on('complete', function(result){
        if (result instanceof Error) {
            sys.puts('Error: ' + result.message);
            process.exit(1); // http://nodejs.org/api/process.html#process_process_exit_code
        } else {
            //sys.puts(result);
            return result;
        }
    })
};

var cheerioHtmlFile = function(htmlfile) {
    return cheerio.load(fs.readFileSync(htmlfile));
};

var loadChecks = function(checksfile) {
    return JSON.parse(fs.readFileSync(checksfile));
};

var checkHtmlFile = function(htmlfile, checksfile) {
    $ = cheerioHtmlFile(htmlfile);
    var checks = loadChecks(checksfile).sort();
    var out = {};
    for(var ii in checks) {
        var present = $(checks[ii]).length > 0;
        out[checks[ii]] = present;
    }
    return out;
};

var clone = function(fn) {
    // Workaround for commander.js issue.
    // http://stackoverflow.com/a/6772648
    return fn.bind({});
};

var download = function(url, callback) {
    var resp = rest.get(url);
    resp.on('complete', function(result) {
        if (result instanceof Error) {
            // callback(result);
            sys.puts('Error: ' + result.message);
            //this.retry(5000); // try again after 5 sec
            return;
        }
        fs.writeFileSync(URL_HTML, result);
        //process.exit(1);
        callback(null, URL_HTML);
    });
};

if(require.main == module) {
    program
        .option('-c, --checks <check_file>', 'Path to checks.json', clone(assertFileExists), CHECKSFILE_DEFAULT)
        .option('-f, --file <html_file>', 'Path to index.html', clone(assertFileExists), HTMLFILE_DEFAULT)
        .option('-u, --url <web_url>', 'web url to download')
        .parse(process.argv);

    // this function loads checks & checks html
    var check = function (err, html) {
        if (err) {
            console.log('Error getting html: ' + err);
            process.exit(1);
        }
        var checkJson = checkHtmlFile(html, program.checks);
        var outJson = JSON.stringify(checkJson, null, 4);
        console.log(outJson);
    }

    if (program.url) {
        // download the provided url and then check the html
        download(program.url, check);
    } else if (program.file) {
        // load html from a file and then check it
        fs.readFile(program.file, check);
    }
} else {
    exports.checkHtmlFile = checkHtmlFile;
}
