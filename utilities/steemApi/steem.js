const { Client } = require('dsteem');
const config = require('config');

const steemUrl = config.nodeUrl || 'https://api.steemit.com';

const client = new Client(steemUrl);
const clientAnyx = new Client('https://anyx.io');

module.exports = { client, clientAnyx };
