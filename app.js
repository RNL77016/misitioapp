const bodyParser = require('body-parser');
const express = require('express');
const app = express();
const cors = require('cors');
const books = require('./routes/books');
const places = require('./routes/places');
const mongoose = require('mongoose');

app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));
app.use('/api/books', books);
app.use('/api/places', places);

mongoose.connect(
    'mongodb+srv://ronisnl:Domelipa321@cluster25712.ga2ds9j.mongodb.net/?retryWrites=true&w=majority&appName=cluster25712')
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error('Could not connect to MongoDB...', err))

app.listen(4000, () => console.log('Server running on port 4000'));