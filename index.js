const express = require('express')
const mongoose = require('mongoose')
const app = express()
const dotenv = require('dotenv').config()
const bcrypt = require('bcrypt')
const bodyParser = require('body-parser')
app.use(bodyParser.json())

const MONGO_URI = process.env.MONGO_URI

mongoose.connect(
  MONGO_URI,
  { useNewUrlParser: true, useUnifiedTopology: true },
  () => {
    console.log('Connected to MongoDB')
  }
)

const registrationSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  password: { type: String, required: true },
})

const Registration = mongoose.model('Registration', registrationSchema)

// Set up routes
app.get('/', (req, res) => {
  res.send('Welcome to the registration app!')
})

app.post('/register', async (req, res) => {
  try {
    const hash = await bcrypt.hash(req.body.password, 10)

    const newUser = new Registration({
      name: req.body.name,
      email: req.body.email,
      password: hash,
    })

    await newUser.save()

    res.send('Registration successful!')
  } catch (error) {
    res.status(400).send('Registration failed. Please try again.')
  }
})

app.post('/login', async (req, res) => {
  if (!req.body.email || !req.body.password) {
    return res.status(400).send('Bad Request: Missing required fields')
  }

  try {
    const user = await Registration.findOne({ email: req.body.email })
    if (!user) {
      return res.status(401).send('Unauthorized: User not found')
    }

    const isPasswordMatch = await bcrypt.compare(
      req.body.password,
      user.password
    )
    if (!isPasswordMatch) {
      return res.status(401).send('Unauthorized: Incorrect password')
    }

    res.send('Login successful!')
  } catch (error) {
    res.status(400).send('Login failed. Please try again.')
  }
})

app.listen(3000, () => {
  console.log('Registration app listening on port 3000!')
})
