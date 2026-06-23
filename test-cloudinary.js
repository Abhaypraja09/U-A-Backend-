const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: 'unnati',
  api_key: '899825131788128',
  api_secret: 'MHV_TDj1oYb-N-g96WzS-LHv0_Y'
});

cloudinary.uploader.upload('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', {
  // folder: 'test'
}, (error, result) => {
  if (error) {
    console.error('Error Details:', JSON.stringify(error, null, 2));
    console.error(error);
  } else {
    console.log('Success:', result.secure_url);
  }
});
