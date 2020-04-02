///////////////////////////////////////////////////
//Dependencies
///////////////////////////////////////////////////

const express = require('express')
const app = express()
const bodyParser = require('body-parser')
const mongo = require('mongodb').MongoClient;
const shortid = require('shortid')
const cors = require('cors')
const mongoose = require('mongoose')

///////////////////////////////////////////////////
//Set up app
///////////////////////////////////////////////////

app.use(cors())

app.use(bodyParser.urlencoded({extended: false}))
app.use(bodyParser.json())

app.use(express.static('public'))

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

mongoose.connect(process.env.MONGO_URI, function (err) {
   if (err) console.error(err);
});

///////////////////////////////////////////////////
//Define the Schema
///////////////////////////////////////////////////

const Schema = mongoose.Schema;

const personSchema = new Schema({
  username: { type: String, required: true, default: shortid.generate},
  description: [String],
  duration: [Number],
  date: [Date]
});

///////////////////////////////////////////////////
//Create new username if unique
///////////////////////////////////////////////////

var Person = mongoose.model("Person", personSchema);

var createPerson = (name, done)=>{
  Person.findOne({username: name}, {username: 1, _id:1}, (err, searchData)=>{
    if(searchData) {
      done(null, "used");
      }
    else if (err){
        done(err);
      }
    else {
      const person = new Person({
        username: name
      })
        person.save((err,data)=>{
          if(err){
            done(err);
          }
          done(null , data);
        });
};
  });
};

app.post("/api/exercise/new-user", (req, res)=>{
  createPerson(req.body.username, (err, nameData)=>{
    if (nameData === "used"){
      res.send({"error": "username already taken"});
    }
    else if(err){
      res.send({error: "error"});
    }
  else
  res.json(nameData);
  });
});

///////////////////////////////////////////////////
//Get Array of all users
/////////////////////////////////////////////////// 

app.get('/api/exercise/users', (req, res) => {
    Person.find({}, {username: 1, _id:1}, function(err, docs){
      if(err){
        res.send({error: "error"})
      }
      else
        res.json(docs);
    });
});
 
///////////////////////////////////////////////////
//Add an Exercise
///////////////////////////////////////////////////

var addExercise = (iden, desc, durat, reqDate, done)=>{
  const filter = {_id: iden}
    Person.findOne(filter, (err, searchData)=>{
    if(!searchData) {
      done(null, "Id not found");
      }
    else if (err){
        done(err);
      }
    else {
      searchData.description.push(desc);
      searchData.duration.push(parseInt(durat));
      searchData.date.push(new Date( reqDate.replace( /(\d{2})-(\d{2})-(\d{4})/, "$2/$1/$3") ));
      searchData.save()
      
      var retData={
            username: searchData.username,
            description: desc,
            duration: parseInt(durat),
            _id: searchData._id,
            date: (new Date( reqDate.replace( /(\d{2})-(\d{2})-(\d{4})/, "$2/$1/$3")).toDateString())
      }
       done(null, retData);
    }
        });
}

app.post("/api/exercise/add", (req, res)=>{
  var dateToPass = {}
  var error = false;
  
  if(!req.body.userId){
    res.send("id is required");
    return;
  }
  else if(!req.body.description){
    res.send("description is required");
    return;
  }
  else if(!req.body.duration){
    res.send("duration is required")
    return;
  }
    else if(isNaN(req.body.duration)==true){
    res.send("duration must be a number (mins)")
    return;
  }
  else if (!req.body.date){
          dateToPass=new Date().toISOString().substring(0,10)
        }
  else {
        var regEx = /^\d{4}-\d{2}-\d{2}$/;
        if(!req.body.date.match(regEx)){
        res.send("invalid date format");
          return;
        }
        else dateToPass=req.body.date
  }
    addExercise(req.body.userId, req.body.description, req.body.duration, dateToPass, (err, idData)=>{
    if (idData === "noID"){
      res.send({"error": "id not found"});
    }
    
    else if(err){
      res.send({error: "error"});
    }
  else
    res.json(idData);
    });
  
});

///////////////////////////////////////////////////
//Get Exercise Log
///////////////////////////////////////////////////

app.get('/api/exercise/log', (req, res) => {
  if(!req.query.userId){
    res.send("you must enter a userId. Format: https://cubic-spiced-blue.glitch.me/api/exercise/log?userId=&ltuserId&gt")
    return;
  }
  else if(req.query.from){
        var regEx = /^\d{4}-\d{2}-\d{2}$/;
        if(!req.query.from.match(regEx)){
        res.send("invalid from date format");
          return;}
  }
  else if(req.query.to){
        var regEx = /^\d{4}-\d{2}-\d{2}$/;
        if(!req.query.to.match(regEx)){
        res.send("invalid to date format");
          return;
        }
  }
Person.findOne({_id: req.query.userId}, (err, searchData)=>{
      if(err){
        res.send({error: "userId not found"})
        return;
      }
      else{
      var retData={
        _id: searchData.id,
        username: searchData.username,
        count: 0,
        log:[]   
      }      
      var start = new Date(-8640000000000000);
      var end = new Date();
      var limit = searchData.date.length-1
      console.log("sel"+start+end+limit)
      console.log("query"+req.query.from)
      if(req.query.from){
        start = new Date( req.query.from.replace( /(\d{2})-(\d{2})-(\d{4})/, "$2/$1/$3") )
      }
        console.log("updatedstart"+start)
      if (req.query.to){
        end = new Date( req.query.to.replace( /(\d{2})-(\d{2})-(\d{4})/, "$2/$1/$3") )
      }
      if (req.query.limit&&req.query.limit<limit&&req.query.limit>=1){
        limit=req.query.limit-1
      }
//        push data into retData.log based on url params
      for(var i=0; i<=limit;i++){
        if(searchData.date[i]>start&&searchData.date[i]<end){
          retData.log.push({
            description: searchData.description[i],
            duration: searchData.duration[i],
            date: searchData.date[i].toDateString()
          })
          retData.count++
        }
      }
        res.json(retData);
      
    }
});
});

///////////////////////////////////////////////////
//Error handling and listener
///////////////////////////////////////////////////


// Not found middleware
app.use((req, res, next) => {
  return next({status: 404, message: 'not found'})
})

// Error Handling middleware
app.use((err, req, res, next) => {
  let errCode, errMessage

  if (err.errors) {
    // mongoose validation error
    errCode = 400 // bad request
    const keys = Object.keys(err.errors)
    // report the first validation error
    errMessage = err.errors[keys[0]].message
  } else {
    // generic or custom error
    errCode = err.status || 500
    errMessage = err.message || 'Internal Server Error'
  }
  res.status(errCode).type('txt')
    .send(errMessage)
})

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
