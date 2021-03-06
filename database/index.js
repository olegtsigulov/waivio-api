const mongoose = require('mongoose');
const config = require('config');

const URI = `mongodb://${config.db.host}:${config.db.port}/${config.db.database}`;

mongoose.connect(URI, { useNewUrlParser: true, useCreateIndex: true, useUnifiedTopology: true })
  .then(() => console.log('connection successful!'))
  .catch((error) => console.log(error));

mongoose.connection.on('error', console.error.bind(console, 'MongoDB connection error:'));

mongoose.Promise = global.Promise;
mongoose.set('debug', process.env.NODE_ENV === 'development');

const models = {};

models.UserWobjects = require('./schemas/UserWobjectsSchema');
models.CommentRef = require('./schemas/CommentRefSchema');
models.ObjectType = require('./schemas/ObjectTypeSchema');
models.WObject = require('./schemas/wObjectSchema');
models.Comment = require('./schemas/CommentSchema');
models.User = require('./schemas/UserSchema');
models.Post = require('./schemas/PostSchema');
models.App = require('./schemas/AppSchema');
models.Campaign = require('./schemas/CampaignSchema');
models.paymentHistory = require('./schemas/paymentHistorySchema');


module.exports = {
  Mongoose: mongoose,
  models,
};
