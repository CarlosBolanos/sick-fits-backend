// let's go!
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(bodyParser.json());

app.get('/', (req, res) => {
    res.send('Hi');
});

app.listen(5000, err => {
    console.log('Ready on http://localhost:5000');
});