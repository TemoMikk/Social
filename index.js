const express = require('express')
const mongoose = require('mongoose')
const app = express()
const dotenv = require('dotenv').config()
const bcrypt = require('bcrypt')
const bodyParser = require('body-parser')
const cors = require('cors')
const fs = require('fs')

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

const photoSchema = new mongoose.Schema({
  name: String,
  data: Buffer,
  caption: String,
  likesUsernames: {
    type: [String],
    default: [],
  },
  commentUsernames: {
    type: [{ username: String, comment: String }],
    default: [],
  },
})

const Registration = mongoose.model('Registration', registrationSchema)
const Photo = mongoose.model('Photo', photoSchema)

app.use(
  cors({
    origin: '*',
    methods: ['GET', 'PUT', 'POST', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
)

// Set up routes
app.get('/', (req, res) => {
  res.send('Welcome to the registration app!')
})
const multer = require('multer')
const upload = multer({ dest: 'uploads/' })

app.post('/upload', upload.single('photo'), (req, res) => {
  if (!req.file) {
    const newCaption = new Photo({
      caption: req.body.caption,
    })
    newCaption.save((err, result) => {
      console.log('Caption added to the database')
      res.send('Caption added')
    })
  } else {
    console.log(req.file, req.body.formData, fs.readFileSync(req.file.path))
    const photo = fs.readFileSync(req.file.path)
    const encodedImage = photo.toString('base64')
    const newPhoto = new Photo({
      name: req.file.originalname,
      data: Buffer.from(encodedImage, 'base64'),
      caption: req.body.caption,
    })
    newPhoto.save((err, result) => {
      console.log('Photo and caption added to the database')
      fs.unlinkSync(req.file.path)
      res.send('File uploaded')
    })
  }
})

app.post('/likes', (req, res) => {
  const { photoId, username } = req.body

  Photo.findById(photoId, (err, photo) => {
    if (err) return res.status(400).send(err)

    console.log(photo)

    photo.likesUsernames.push(username)
    photo.save((error, result) => {
      if (error) return res.status(400).send(error)

      res.send({ message: 'Username added to the usernames array' })
    })
  })
})

app.post('/dislike', (req, res) => {
  const { photoId, username } = req.body

  Photo.findById(photoId, (err, photo) => {
    if (err) return res.status(400).send(err)
    if (!photo) return res.status(400).send({ message: 'Photo not found' })

    const index = photo.usernames.indexOf(username)
    if (index === -1)
      return res
        .status(400)
        .send({ message: 'Username not found in usernames array' })

    photo.usernames.splice(index, 1)
    photo.save((error, result) => {
      if (error) return res.status(400).send(error)

      res.send({ message: 'Username removed from the likes array' })
    })
  })
})

app.post('/comments', (req, res) => {
  const { photoId, username, comment } = req.body

  Photo.findById(photoId, (err, photo) => {
    if (err) return res.status(400).send(err)

    photo.commentUsernames.push({ username, comment })
    photo.save((error, result) => {
      if (error) return res.status(400).send(error)

      res.send({ message: 'Comment added ' })
    })
  })
})

app.get('/posts', (req, res) => {
  Photo.find({}, (err, Photo) => {
    res.send(Photo)
  })
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

app.listen(3001, () => {
  console.log('Registration app listening on port 3000!')
})
