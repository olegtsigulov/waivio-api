const AWS = require('aws-sdk');
const sharp = require('sharp');
const piexifjs = require('piexifjs');

class Image {
  constructor() {
    const spacesEndpoint = new AWS.Endpoint(process.env.AWS_ENDPOINT);

    this._s3 = new AWS.S3({
      endpoint: spacesEndpoint,
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      params: {
        Bucket: 'waivio',
        ACL: 'public-read',
        ContentType: 'image/webp',
        ContentEncoding: 'base64',
      },
    });
  }

  async uploadInS3(base64, fileName, size = '') {
    if (base64) {
      try {
        // eslint-disable-next-line no-buffer-constructor
        // const buffer = new Buffer(base64, 'base64');
        const body = await this.resizeImage({ base64, size });
        // const data = body.toString('binary');
        // const res = await piexifjs.remove(data);
        // buffer = Buffer.from(res, 'binary');
        return new Promise((resolve) => {
          this._s3.upload({ Body: body, Key: `${fileName}${size}` }, (err, data) => {
            if (err) {
              resolve({ error: `Error upload image:${err}` });
            } if (data) {
              // console.log(data.Location);
              resolve({ imageUrl: data.Location });
            }
          });
        });
      } catch (error) {
        return { error };
      }
    }
    return { error: 'Error parse image' };
  }

  // eslint-disable-next-line class-methods-use-this
  async resizeImage({ base64, size }) {
    // const data = buffer.toString('binary');
    const res = await piexifjs.remove(base64);
    const newBuffer = Buffer.from(res, 'binary');
    if (size === '_small') {
      return sharp(newBuffer).rotate(360).resize(34, 34).toBuffer();
    } if (size === '_medium') {
      return sharp(newBuffer).rotate(360).resize(180, 180).toBuffer();
    }
    return sharp(newBuffer).rotate(360).toBuffer();
  }
}

const image = new Image();

module.exports = image;
