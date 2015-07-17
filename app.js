var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');

var routes = require('./routes/index');
var users = require('./routes/users');
var multer = require('multer');
var util = require("util"); 
var fs = require("fs"); 
var parse = require('csv-parse');

var dataSet = require('./latlong.json');

console.log(dataSet[94117]);

var app = express();

var http = require('http').Server(app);
var io = require('socket.io')(http);
var uploads = require('./routes/uploads');


app.use(multer({
  dest: './upload'
}));
// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs');

// uncomment after placing your favicon in /public
//app.use(favicon(__dirname + '/public/favicon.ico'));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', routes);
app.use('/users', users);




//app.use('/uploads', uploads);


if (typeof(Number.prototype.toRadians) === "undefined") {
  Number.prototype.toRadians   = function() {
    return this * Math.PI / 180;
  }
}


function getDistance(akZip, billZip, AkLat, AkLong) {
  
  var lat2 = parseFloat(dataSet[billZip][1]);
  var lon2 = parseFloat(dataSet[billZip][2]);


var R = 6371000  * 0.00062137; // meters * meters per mile
var zz1 = AkLat.toRadians();
var zz2 = lat2.toRadians();
var yyzz = (lat2-AkLat).toRadians();
var yyxx = (lon2-AkLong).toRadians();

var a = Math.sin(yyzz/2) * Math.sin(yyzz/2) +
        Math.cos(zz1) * Math.cos(zz2) *
        Math.sin(yyxx/2) * Math.sin(yyxx/2);
var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

var d = R * c;

//console.log("User's Akamai Data ("+akZip+" | "+AkLat+"/"+AkLong+") is "+d+" miles away from their Billing Zip: "+billZip);
return d;
}



//Setup Pie Chart
var output = [
    {y: 0, name:"exact zipcode match",legendMarkerType: "square"},
    {y: 0, name:"less than 10 miles",legendMarkerType: "square"},
    {y: 0, name:"less than 50 miles",legendMarkerType: "square"},
    {y: 0, name:"less than 100 miles",legendMarkerType: "square"},
    {y: 0, name:"100 miles or greater",legendMarkerType: "square"}
];

//Set Histogram Object
var histogram = [
                 {y: 0, label:"zip match",legendMarkerType: "square"}
];

for (itr = 20; itr <= 400; itr+=20) {
  histogram.push({y: 0, label:"< " + itr + " m",legendMarkerType: "square"});
}
histogram.push({y: 0, label:"> 3000 m",legendMarkerType: "square"});

var stateList = new Array("AK","AL","AR","AZ","CA","CO","CT","DC","DE","FL","GA","HI","IA","ID", "IL","IN","KS","KY","LA","MA","MD","ME","MI","MN","MO","MS","MT","NC","ND","NE","NH","NJ","NM","NV","NY", "OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VA","VT","WA","WI","WV","WY");


//Set Billing Zip Spline
var bspline = [
               
];

for (itr = 0; itr < stateList.length; itr++) {
  var data = {
      type: "spline",
      name: stateList[itr],
      showInLegend: true,        
      dataPoints: [
      ]
    }              
  for (itr2 = 0; itr2 <= 400; itr2+=20) {                   
    data.dataPoints.push({x:itr2, y:0});
  } 
  
  bspline.push(data); 
}

//Set Akamai Zip Spline 
var aspline = [
               
];

for (itr = 0; itr < stateList.length; itr++) {
  var data = {
      type: "spline",
      name: stateList[itr],
      showInLegend: true,        
      dataPoints: [
      ]
    }              
  for (itr2 = 0; itr2 <= 400; itr2+=20) {                   
    data.dataPoints.push({x:itr2, y:0});
  } 
  
  aspline.push(data); 
}
var columnNumber = 0;
var parsedDataSets = [[],[],[],[],[]];
var lastPieClick = null;

function parseData(record) {
  console.log("Data: " + record[columnNumber]);
  try {
    var data = record[columnNumber],
        dataSplit = data.split('|'),
        billZip = parseInt(dataSplit[0]),
        akZip = parseInt(dataSplit[1]),
        akLat = parseFloat(dataSplit[2]),
        akLng = parseFloat(dataSplit[3]),
        billLat = parseFloat(dataSet[billZip][1]),
        billLng = parseFloat(dataSet[billZip][2]),
        repeats = record[columnNumber+1];
    for(rep = 0; rep < repeats; rep++) {
      if(billZip == akZip) {
        output[0].y += 1;
        histogram[0].y += 1;
        if(rep ==0) parsedDataSets[0].push([akLat+','+akLng, dataSet[akZip][0], billLat + "," +billLng, dataSet[billZip][0],0]);
      } else {
        var miles = getDistance(akZip, billZip, akLat, akLng);
        console.log("Miles: " + miles);
        switch (true) {
        case (miles < 10):
          output[1].y += 1;
        if(rep ==0) parsedDataSets[1].push([akLat+','+akLng, dataSet[akZip][0], billLat + "," +billLng, dataSet[billZip][0], miles]);
          break;
        case (miles >= 10 && miles < 50):
          output[2].y += 1;
        if(rep ==0) parsedDataSets[2].push([akLat+','+akLng, dataSet[akZip][0], billLat + "," +billLng, dataSet[billZip][0], miles]);
          break;
        case (miles >= 50 &&miles < 100):
          output[3].y += 1;
        if(rep ==0) parsedDataSets[3].push([akLat+','+akLng, dataSet[akZip][0], billLat + "," +billLng, dataSet[billZip][0], miles]);
          break;
        case (miles >= 100):
          output[4].y += 1;
        if(rep ==0)  parsedDataSets[4].push([akLat+','+akLng, dataSet[akZip][0], billLat + "," +billLng, dataSet[billZip][0], miles]);
          break;
        }
        
        var whichHisto = Math.ceil(miles / 20);
        console.log("whichhisto: " + whichHisto);
        if(whichHisto > 20) {
          histogram[21].y += 1;      
        } else {
          histogram[whichHisto].y += 1;
        }
        
        var bpos = stateList.indexOf(dataSet[billZip][0]);
        var apos = stateList.indexOf(dataSet[akZip][0]);
        if(whichHisto > 20) {
          whichHisto = 20;
        }
        console.log('1');
        bspline[bpos].dataPoints[whichHisto].y += 1;
        console.log('2');
        //console.log(bpos + " | " + dataSet[billZip][0] + " | " + whichHisto);
        aspline[apos].dataPoints[whichHisto].y += 1;
        console.log('3');
        //console.log(apos + " | " + dataSet[akZip][0] + " | " + whichHisto);
        
      }
    }
    if(recorditr % 1000 === 0) {
    console.log(parsedDataSets);
    io.emit('graph update', output);
    io.emit('histo update', histogram);
    io.emit('aspline update', aspline);
    io.emit('bspline update', bspline);
    }
    //console.log(billZip);
  } catch(e) {
    console.log("Error: " + e);
  }
}




//Create the parser
var parser = parse({delimiter: ','});
//Use the writable stream api
var recorditr = 0;
parser.on('readable', function(){
  while(record = parser.read()){
    console.log("Itr: " + (recorditr++));
    parseData(record);
  }
  
});

//Catch any error
parser.on('error', function(err){
  console.log(err.message);
});

parser.on('end', function() {
  io.emit('graph update', output);
  io.emit('histo update', histogram);
  io.emit('aspline update', aspline);
  io.emit('bspline update', bspline);

  console.log(aspline);
  
});



app.post("/upload", function(req, res, next){ 
if (req.files) { 
console.log(util.inspect(req.files));
if (req.files.myFile.size === 0) {
            return next(new Error("Hey, first would you select a file?"));
}
fs.exists(req.files.myFile.path, function(exists) { 
  if(exists) { 
    res.render("index", {title: "Zip Parser"});  
    fs.createReadStream(req.files.myFile.path).pipe(parser);
  } else { 
    res.end("Well, there is no magic for those who don’t believe in it!"); 
  } 
}); 
} 
});


// catch 404 and forward to error handler
app.use(function(req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
    app.use(function(err, req, res, next) {
        res.status(err.status || 500);
        res.render('error', {
            message: err.message,
            error: err
        });
    });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
        message: err.message,
        error: {}
    });
});



io.on('connection', function(socket){
  io.emit('init', 'foo');
  io.emit('graph update', 'apple');
  io.emit('graph update', output);
  io.emit('histo update', histogram);
  io.emit('aspline update', aspline);
  io.emit('bspline update', bspline);
  socket.on('column update', function(val){
    columnNumber = val;
    console.log('Column Set To: ' + val);
  });
  socket.on('pie click', function(val){
    console.log(parsedDataSets[val]);
    io.emit('data update', parsedDataSets[val]);
  });


});

http.listen(9000, function(){
  console.log('listening on *:9000');
});

