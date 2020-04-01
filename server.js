const express = require('express')
const app = express()
const bodyParser = require('body-parser')
const mongo = require('mongodb').MongoClient;
const shortid = require('shortid')
const cors = require('cors')
const mongoose = require('mongoose')

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

const Schema = mongoose.Schema;

const personSchema = new Schema({
  username: { type: String, required: true, default: shortid.generate},
  exercise: String,
  duration: String,
  date: {}
});

//Create new username if unique
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
        username: name,
        exercise: "",
        duration: "",
        date: {}
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
  res.send({"username":nameData.username});
  });
});



 

//I can get an array of all users by getting api/exercise/users with the same info as when creating a user.

//Add Exercises

  //if required data is not entered return Path `duration`/`description is required.

  //return object containing the username, exercise, duration, and date (default to today)


  //you can retrieve all of a users data from GET users's exercise log: GET /api/exercise/log?{userId}[&from][&to][&limit]

//{ } = required, [ ] = optional

//from, to = dates (yyyy-mm-dd); limit = number










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
