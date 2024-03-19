// import modules
const http = require('http');
const path = require('path');
const multer = require('multer');
const express = require("express");
const mongoose = require("mongoose");
mongoose.set('strictQuery', false);
const morgan = require("morgan");
const cors = require("cors");
require("dotenv").config();

const MongoURI = process.env.MONGO_URI;

const app = express();

const httpServer = http.createServer(app);

mongoose.connect(MongoURI)
  .then(() =>
    console.log("MongoDB is now connected!")).
  then(() => {
    app.listen(port, () => {
      console.log(`Server is running on port ${port}`)
    })
  }).
  catch(err => console.log("DB CONNECTION ERROR", err));

// middleware
app.use(morgan("dev"));
app.use(cors({ origin: true, credentials: true }));
app.use((req, res, next) => {
  console.log(req.path, req.method)
  next();
});
app.use(express.json()); // to allow us to access the body
app.use(express.static('./public'));
app.use(express.urlencoded({ extended: false }));


// routes
const playerRoutes = require('./routes/Player')
const adminRoutes = require('./routes/Admin')
const messagesRoutes = require('./routes/Messages')

app.use('/user', playerRoutes)
app.use('/admin', adminRoutes)
app.use('/user', messagesRoutes)

// port
const port = process.env.PORT || "8000";

'use strict';
const request = require('request');
const apiKey = '6M2WEAHATT4WGHXM';

const getStockData = (symbol, interval = '1min', queryFunction) => {
  let apiUrl;
  if (queryFunction === 'TIME_SERIES_INTRADAY') {
    apiUrl = `https://www.alphavantage.co/query?function=TIME_SERIES_INTRADAY&symbol=${symbol}&interval=${interval}&apikey=${apiKey}`;
  } else if (queryFunction === 'GLOBAL_QUOTE') {
    apiUrl = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${apiKey}`;
  } else {
    return Promise.reject('Invalid query function');
  }

  return new Promise((resolve, reject) => {
    request.get({
      url: apiUrl,
      json: true,
      headers: { 'User-Agent': 'request' }
    }, (err, response, data) => {
      if (err) {
        console.error('Error:', err);
        reject('Internal Server Error');
      } else if (response.statusCode !== 200) {
        console.error('Status:', response.statusCode);
        reject('Failed to fetch data');
      } else {
        resolve(data);
      }
    });
  });
};

app.get('/query/:symbol/:queryFunction', async (req, res) => {
  const { symbol, queryFunction } = req.params;

  try {
    const stockData = await getStockData(symbol, undefined, queryFunction);
    res.status(200).json(stockData);
  } catch (error) {
    res.status(500).json({ error });
  }
});

//apikey=6M2WEAHATT4WGHXM