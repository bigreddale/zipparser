var express = require('express'); 
var router = express.Router(); 
var util = require("util"); 
var fs = require("fs"); 
var parse = require('csv-parse');


var output = [];
//Create the parser
var parser = parse({delimiter: ','});
//Use the writable stream api
parser.on('readable', function(){
  while(record = parser.read()){
   output.push(record);
   console.log(record.length);
   io.emit('graph update', output);

  }
});
//Catch any error
parser.on('error', function(err){
console.log(err.message);
});

router.get('/', function(req, res) { 
  res.render("uploadPage", {title: "I love files!"}); 
}); 
 
router.post("/upload", function(req, res, next){ 
  if (req.files) { 
    console.log(util.inspect(req.files));
    if (req.files.myFile.size === 0) {
                return next(new Error("Hey, first would you select a file?"));
    }
    fs.exists(req.files.myFile.path, function(exists) { 
      if(exists) { 
        fs.createReadStream(req.files.myFile.path).pipe(parser);
        res.render("index", {title: "Zip Parser"});  
      } else { 
        res.end("Well, there is no magic for those who don’t believe in it!"); 
      } 
    }); 
  } 
});



module.exports = router;