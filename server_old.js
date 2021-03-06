//  OpenShift sample Node application
var express = require('express'),
  app = express();

const mysql = require('mysql');
const Joi = require('joi');
const cors = require('cors');

Object.assign = require('object-assign')

app.use(express.json());
var port = process.env.PORT || process.env.OPENSHIFT_NODEJS_PORT || 8080,
  ip = process.env.IP || process.env.OPENSHIFT_NODEJS_IP ||  '0.0.0.0';

const conn = mysql.createConnection({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: 'digital_store',

});

//connect to database
conn.connect((err) => {
  if (err) return err;
  console.log('Mysql Connected...');
})

app.get('/', (req, res) => res.send('Hello World!!!!!'))

app.get('/api/converter', (req, res) => {

  let sql = "SELECT * FROM digital";
  let query = conn.query(sql, (err, results) => {
    if (err) return res.send(err);
    res.send(results);
    console.log(results);
  });

})

// add speech 
app.post('/api/converter/', (req, res) => {

 

  const file_id = req.body.file_id;
  const file_path = req.body.file_path;
  const latitude = req.body.latitude;
  const longitude = req.body.longitude;
  const server_path =  req.body.file_path;

  main(server_path).then(function (data) {

    setTimeout(function () {

      let sql = "INSERT INTO digital SET file_description='" + data + "', file_path='" + server_path + "', file_id='" + file_id + "',latitude='" + latitude + "', longitude='" + longitude + "',status='Inserted' ";
      let query = conn.query(sql, (err, results) => {
        if (err) return err;
        console.log(results)
      })

    }, 1)

  }).catch(console.error)

  res.send("the audio has been transcribed as  ")

})

function validateSpeechdata(name) {
  const schema = {
    name: Joi.string().min(3).required(),
    file_id: Joi.string().min(3).required(),
    file_path: Joi.string().min(3).required(),
    longitude: Joi.string().min(3).required(),
    latitude: Joi.string().min(3).required(),
  };
  return Joi.validate(name, schema);

}
async function main(filename) {
  // Imports the Google Cloud client library
  const speech = require('@google-cloud/speech');
  const fs = require('fs');

  // Creates a client
  const client = new speech.SpeechClient();

  // The name of the audio file to transcribe
  const fileName = filename;

  // Reads a local audio file and converts it to base64
  const file = fs.readFileSync(fileName);
  const audioBytes = file.toString('base64');

  // The audio file's encoding, sample rate in hertz, and BCP-47 language code
  const audio = {
    content: audioBytes,
  };
  const config = {

    languageCode: 'en-US',
    audioChannelCount: 1,
    enableSeparateRecognitionPerChannel: true,
    enableWordTimeOffsets: true
  };
  const request = {
    audio: audio,
    config: config,
  };

  // Detects speech in the audio file
  const [response] = await client.recognize(request);
  const transcription = response.results
    .map(result => result.alternatives[0].transcript)
    .join('\n');
  console.log(`Transcription: ${transcription}`);
  return transcription;
}


// error handling
app.use(function (err, req, res, next) {
  console.error(err.stack);
  res.status(500).send('Something bad happened!');
});

app.listen(port, ip);
console.log('Server running on http://%s:%s', ip, port);

module.exports = app;
