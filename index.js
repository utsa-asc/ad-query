var ActiveDirectory = require('activedirectory');
var csv = require('fast-csv');
var fs = require('fs');
require('dotenv').config();

var config = {
  url: process.env.URL,
  secure: true,
  host: process.env.HOST,
  port: 636,
  baseDN: process.env.BASEDN,
  bindDN: process.env.BINDDN,
  bindCredentials: process.env.BINDCREDENTIALS
};
process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '0';
var ad = new ActiveDirectory(config);
var emailTasks = [];
var ssoHash = {};
//var csvStream = csv.createReadStream({headers: true});
var writableStream = fs.createWriteStream("output.csv");
//var stream = fs.createReadStream("input.csv");
const stream = csv.format();
stream.pipe(writableStream);




writableStream.on("finish", function(){ console.log("DONE!"); });
//csvStream.pipe(writableStream);

fs.createReadStream('input.csv')
  .pipe(csv.parse({ headers: true }))
  .on('data', function(obj) {
    console.log('adding row');
    emailTasks.push(obj.setEmailAddr);
  }).on("end", function() {

    /*
    Promise.all(emailTasks.map(processEachTask)).then(afterAllTasks);
    // async/await notation:
    // you must be in an "async" environement to use "await"
    */
    async function wrapper () {
        await Promise.all(emailTasks.map(processEachTask));
        //finish();
    }
    // async function return a promise transparently
    wrapper();

    /*
    console.log("waiting for tasks");
    async.forEachOfSeries(emailTasks, processEachTask, afterAllTasks);
    */
    function processEachTask(task, callback) {
      console.log('lookup user: ' + task);
      var query = 'mail=' + task;
      ad.findUsers(query, true, function(err, users) {
        if (err) {
          console.log('ERROR during query: ' + query);
          console.log(JSON.stringify(err));
        }
        if ((! users) || (users.length == 0)) {
          console.log('No user found with query:' + query);
        } else {
          if (users.length == 1) {
            var thisUser = users[0];
            //console.dir(thisUser);
            var sso = thisUser['sAMAccountName'];
            ssoHash[task] = sso;
            var data = { "email": task, "sso": sso };
            //csvStream.write({email: obj.setEmailAddr, sso: sso});
            stream.write([task, sso]);
            console.log('found: ' + query + ' : ' + thisUser['sAMAccountName']);
          } else {
            console.log('More than one user found with query: ' + query);
            console.log(users.length);
          }
        }
      });
    }

    function afterAllTasks(err) {
      console.log("all done?");
      console.dir(ssoHash);
    }
});
/*
csv.parseStream(stream, {headers : true}).on("data", function(obj){
}).on("end", function() {
*/
