// Quick script to check Supabase health endpoint
const https = require('https');

const codespaceUrl = 'https://vigilant-spork-q667vwj94c9x55-54321.app.github.dev/rest/v1/';
console.log(`Checking Supabase health at: ${codespaceUrl}`);

const request = https.get(codespaceUrl, (res) => {
  console.log(`STATUS: ${res.statusCode}`);
  console.log(`HEADERS: ${JSON.stringify(res.headers)}`);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log(`BODY: ${data}`);
  });
}).on('error', (err) => {
  console.error(`ERROR: ${err.message}`);
});

request.end();