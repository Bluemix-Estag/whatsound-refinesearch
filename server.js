var express = require("express");
var app = express();
var cfenv = require("cfenv");
var request = require('request');
var bodyParser = require('body-parser')

var CUSTOMSEARCH_KEY = "AIzaSyAbnV-VN6hTDxJyEXxizRv4cLKuudYl8bk";
var CUSTOMSEARCH_CX = "013164454877212744312:svfzuhhysqa"

// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }))

// parse application/json
app.use(bodyParser.json())

var mydb;

app.get('/whatsound/api/v1/refine/values', function (req, res) {
    var query = req.query.search;
    console.log("Entrou");
    if(query === undefined){
      res.status(400).json(callError("Search parameter not defined"));
    }
    else if(query == ""){
      res.status(400).json(callError("Search parameter not defined"));
    }
    else{
      // tipo = tracks, artists, albums
      var options = {
          url: "https://www.googleapis.com/customsearch/v1?key="+CUSTOMSEARCH_KEY+"&cx="+CUSTOMSEARCH_CX+"&q="
          + query +"&gl=br&num=1&exactTerms=VAGALUME",
          headers: {
              Accept: 'text/json'
          }
      };

      function callback(error, response, body) {
          if (!error && response.statusCode == 200) {
              var info = JSON.parse(body);
              if (info != ' ') {

                try{
                  var crude = JSON.stringify(info['items']['0']['title']);
                  console.log(crude);
                  var result1 = setOutput(crude);
                  res.send(result1);
                }
                catch(err1){
                  try{
                    var spelling = JSON.stringify(info['spelling']['correctedQuery']);
                    console.log("Spelling");
                    var options2 = {
                        url: "https://www.googleapis.com/customsearch/v1?key=AIzaSyC-Tma5_gMM9DcmSY2swYnhPF89UEX6gyg&cx=013580269037227782210:yarymksnrvm&q="
                        + spelling.replace(" \"VAGALUME\"", "") +"&gl=br&num=1&exactTerms=VAGALUME",
                        headers: {
                            Accept: 'text/json'
                        }
                    };

                    function callback2(error, response, body) {
                        if (!error && response.statusCode == 200) {
                          console.log("check1");
                            var info = JSON.parse(body);
                            if (info != ' ') {
                              console.log("check2");
                              try{
                                var crude = JSON.stringify(info['items']['0']['title']);
                                console.log(crude);
                                var result2 = setOutput(crude);
                                console.log("Second");
                                res.send(result2);
                              }
                              catch(err){
                                console.log("check3");
                                res.status(404).json(callError("Attempt Limit"));
                              }
                            }
                            else{
                              res.status(404).json(callError("No Items Found"));
                            }
                        }
                        else{
                          console.log(JSON.stringify(error));
                          res.status(response.statusCode).json(callError("Google Error"));
                        }
                    }
                    request(options2, callback2);

                  }
                  catch(err2){
                    res.status(404).json(callError("No Items Found"));
                  }
                }
              }
              else{
                res.status(404).json(callError("No Items Found"));
              }
          }
          else{
            console.log(JSON.stringify(error));
            res.status(response.statusCode).json(callError("Google Error"));
          }
      }

      request(options, callback);
    }

});

function setOutput(crude){
  var arrumada = removerAcentos(crude).replace("(traducao)", "").replace("(cifrada)", "").replace("\"", "").toLowerCase();
  var partes = arrumada.split(" - ");
		if(partes.length == 4){
      var result = {
        type: "album",
        query: partes[0]+"+"+partes[1],
        status: true,
        message: ""
      }
      return result;
		}
		else if(partes.length == 3){
      var result = {
        type: "track",
        query: partes[0]+"+"+partes[1],
        status: true,
        message: ""
      }
      return result;
		}
		else if(partes.length == 2){
      var result = {
        type: "artist",
        query: partes[0],
        status: true,
        message: ""
      }
      return result;
		}
		else{
      var result = {
        type: "",
        query: "",
        status: false,
        message: "Type not identified"
      }
      return result;
      console.log("Nada encontrado");
		}
}

function callError(message){
  var error = {
    type: "",
    query: "",
    status: false,
    message: message
  }
  return error;
}

function removerAcentos( newStringComAcento ) {
  var string = newStringComAcento;
	var mapaAcentosHex 	= {
		a : /[\xE0-\xE6]/g,
		e : /[\xE8-\xEB]/g,
		i : /[\xEC-\xEF]/g,
		o : /[\xF2-\xF6]/g,
		u : /[\xF9-\xFC]/g,
		c : /\xE7/g,
		n : /\xF1/g
	};

	for ( var letra in mapaAcentosHex ) {
		var expressaoRegular = mapaAcentosHex[letra];
		string = string.replace( expressaoRegular, letra );
	}

	return string;
}

// load local VCAP configuration  and service credentials
var vcapLocal;
try {
  vcapLocal = require('./vcap-local.json');
  console.log("Loaded local VCAP", vcapLocal);
} catch (e) { }

const appEnvOpts = vcapLocal ? { vcap: vcapLocal} : {}

const appEnv = cfenv.getAppEnv(appEnvOpts);

if (appEnv.services['cloudantNoSQLDB']) {
  // Load the Cloudant library.
  var Cloudant = require('cloudant');

  // Initialize database with credentials
  var cloudant = Cloudant(appEnv.services['cloudantNoSQLDB'][0].credentials);

  //database name
  var dbName = 'mydb';

  // Create a new "mydb" database.
  cloudant.db.create(dbName, function(err, data) {
    if(!err) //err if database doesn't already exists
      console.log("Created database: " + dbName);
  });

  // Specify the database we are going to use (mydb)...
  mydb = cloudant.db.use(dbName);
}

//serve static file (index.html, images, css)
app.use(express.static(__dirname + '/views'));



var port = process.env.PORT || 3000
app.listen(port, function() {
    console.log("To view your app, open this link in your browser: http://localhost:" + port);
});
