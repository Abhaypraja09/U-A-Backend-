const https = require('https');
const crypto = require('crypto');

const cloudName = 'dlffvoetz';
const apiKey = '899825131788128';
const apiSecret = 'MHV_TDj1oYb-N-g96WzS-LHv0_Y';

const timestamp = Math.round(new Date().getTime() / 1000);
const signature = crypto.createHash('sha1').update(`timestamp=${timestamp}${apiSecret}`).digest('hex');

const boundary = '--------------------------' + Math.random().toString(36).substring(2);

let body = '';
body += `--${boundary}\r\nContent-Disposition: form-data; name="file"\r\n\r\ndata:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=\r\n`;
body += `--${boundary}\r\nContent-Disposition: form-data; name="api_key"\r\n\r\n${apiKey}\r\n`;
body += `--${boundary}\r\nContent-Disposition: form-data; name="timestamp"\r\n\r\n${timestamp}\r\n`;
body += `--${boundary}\r\nContent-Disposition: form-data; name="signature"\r\n\r\n${signature}\r\n`;
body += `--${boundary}--\r\n`;

const options = {
  hostname: 'api.cloudinary.com',
  port: 443,
  path: `/v1_1/${cloudName}/image/upload`,
  method: 'POST',
  headers: {
    'Content-Type': `multipart/form-data; boundary=${boundary}`,
    'Content-Length': Buffer.byteLength(body)
  }
};

const req = https.request(options, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    console.log('Body:', data);
  });
});

req.on('error', e => console.error(e));
req.write(body);
req.end();
