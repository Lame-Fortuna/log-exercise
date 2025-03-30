const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const bodyParser = require("body-parser");
require('dotenv').config()


const app = express();
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cors())
app.use(express.static('public'))
app.use(express.json()); // Also allows JSON payloads


const USERS_FILE = path.join(__dirname, "users.json");
const EXERCISES_FILE = path.join(__dirname, "exercises.json");

// Initialize files if they don't exist
if (!fs.existsSync(USERS_FILE)) fs.writeFileSync(USERS_FILE, "[]");
if (!fs.existsSync(EXERCISES_FILE)) fs.writeFileSync(EXERCISES_FILE, "[]");

// Read JSON from file
const readJSON = (file) => JSON.parse(fs.readFileSync(file, "utf8"));

// Write JSON to file
const writeJSON = (file, data) => fs.writeFileSync(file, JSON.stringify(data, null, 2));

// ========================== USER ROUTES ==========================


app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

// Create new user
app.post("/api/users", (req, res) => {
  const users = readJSON(USERS_FILE);
  const newUser = { username: req.body.username, _id: Date.now().toString() };
  users.push(newUser);
  writeJSON(USERS_FILE, users);
  res.json(newUser);
});

// Get all users
app.get("/api/users", (req, res) => {
  const users = readJSON(USERS_FILE);
  res.json(users);
});

// ========================== EXERCISE ROUTES ==========================

// Add exercise to user
app.post("/api/users/:_id/exercises", (req, res) => {
  const users = readJSON(USERS_FILE);
  const exercises = readJSON(EXERCISES_FILE);

  const user = users.find((u) => u._id === req.params._id);
  if (!user) return res.status(400).json({ error: "User not found" });

  const date = req.body.date ? new Date(req.body.date) : new Date();
  if (isNaN(date.getTime())) return res.status(400).json({ error: "Invalid date" });

  const newExercise = {
    _id: user._id,
    username: user.username,
    description: req.body.description,
    duration: Number(req.body.duration),
    date: date.toDateString(), // "Mon Jan 01 1990"
  };

  exercises.push(newExercise);
  writeJSON(EXERCISES_FILE, exercises);

  res.json(newExercise);
});

// ========================== LOG ROUTES ==========================

// Get exercise log for user
app.get("/api/users/:_id/logs", (req, res) => {
  const users = readJSON(USERS_FILE);
  const exercises = readJSON(EXERCISES_FILE);

  const user = users.find((u) => u._id === req.params._id);
  if (!user) return res.status(400).json({ error: "User not found" });

  let log = exercises.filter((e) => e._id === user._id);

  // Apply "from" and "to" filters
  if (req.query.from || req.query.to) {
    const fromDate = req.query.from ? new Date(req.query.from) : null;
    const toDate = req.query.to ? new Date(req.query.to) : null;
    log = log.filter((entry) => {
      const entryDate = new Date(entry.date);
      return (!fromDate || entryDate >= fromDate) && (!toDate || entryDate <= toDate);
    });
  }

  // Apply "limit" filter
  if (req.query.limit) log = log.slice(0, Number(req.query.limit));

  res.json({
    username: user.username,
    count: log.length,
    _id: user._id,
    log: log.map(({ description, duration, date }) => ({ description, duration, date })),
  });
});

// ========================== SERVER ==========================
const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
