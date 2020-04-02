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
  exercise: String,
  duration: String,
  date: {}
});

///////////////////////////////////////////////////
//Create new username if unique
///////////////////////////////////////////////////

var Person = mongoose.model("Person", personSchema);

var createPerson = (name, done)=>{
  Person.findOne({username: name}, (err, searchData)=>{
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
      console.log(docs);
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
      searchData.exercise.push(desc);
      searchData.duration.push(durat);
      searchData.date.push(reqDate);
      searchData.save((err, data)=>{
        if(err){
        done(err)
      }
          done(null , data);
        });
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

  //you can retrieve all of a users data from GET users's exercise log by entering userid. 
//Will return Object with array log and count of exercises
//Will return partial data based on optional parameters, as below
//GET /api/exercise/log?{userId}[&from][&to][&limit]

//{ } = required, [ ] = optional

//from, to = dates (yyyy-mm-dd); limit = number







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
