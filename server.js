//  OpenShift sample Node application
var express = require('express');
const  req= require('request');
  app = express();
  var bodyParser = require('body-parser');
const mysql = require('mysql');
const Joi = require('joi');
const cors = require('cors');
const twilio = require('twilio');

  
// use it before all route definitions
app.use(cors({origin: '*'}));
const ClientCapability = twilio.jwt.ClientCapability;
const VoiceResponse = twilio.twiml.VoiceResponse;

Object.assign = require('object-assign')

app.use(express.json());
var jsonParser= bodyParser.json();
var urlencodeParser =bodyParser.urlencoded({extended:false})

process.env.GOOGLE_APPLICATION_CREDENTIALS = 'credentials.json';

console.log(process.env.GOOGLE_APPLICATION_CREDENTIALS);
var port = process.env.PORT || process.env.OPENSHIFT_NODEJS_PORT || 8080,
  ip = process.env.IP || process.env.OPENSHIFT_NODEJS_IP ||  'localhost';

const conn = mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || '3306',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || '',
  database: 'digital_store',

});

//connect to database
conn.connect((err) => {
  if (err) return err;
  console.log('Mysql Connected...');
})



app.get('/', (req, res) => {
  require('dotenv').config();
  const accountSid= process.env.TWILIO_ACCOUNT_SID;
  console.log(accountSid);
  res.send('Hello World!!!!!')}
  )


// Generate a Twilio Client capability token
app.get('/token', (request, response) => {
  require('dotenv').config();
  const capability = new ClientCapability({
    accountSid: process.env.TWILIO_ACCOUNT_SID,
    authToken: process.env.TWILIO_AUTH_TOKEN,
  });

  capability.addScope(
    new ClientCapability.OutgoingClientScope({
      applicationSid: process.env.TWILIO_TWIML_APP_SID})
  );

  const token = capability.toJwt();

  // Include token in a JSON response
  response.send({
    token: token,
  });
});

// Create TwiML for outbound calls
app.post('/voice',urlencodeParser, (req, res) => {
  require('dotenv').config();

  let voiceResponse = new VoiceResponse();

  voiceResponse.dial({
    callerId: process.env.TWILIO_NUMBER,
  }, req.body.number);
  res.type('text/xml');
  res.send(voiceResponse.toString());
});


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

  const result = validateSpeechdata(req.body);

  console.log(result);
  
    if(result.error){
      res.status(400).send(result.error.details[0].message)
      return
    }
 
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
function responseValidate(response) {
  const schema = {
    name: Joi.objectId().required(),
    response: Joi.string().min(3).max(512).required()
  };

  return Joi.validate(response, schema);
}
function validateSpeechdata(name) {
 

  const schema = Joi.object({
    name: Joi.string().min(3).required(),
    file_id: Joi.string().min(3).required(),
    file_path: Joi.string().min(3).required(),
    longitude: Joi.string().min(3).required(),
    latitude: Joi.string().min(3).required(),
  });

  return schema.validate(name);

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
