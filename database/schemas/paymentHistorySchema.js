const mongoose = require('mongoose');
const Float = require('mongoose-float').loadType(mongoose, 4);

const paymentHistorySchema = new mongoose.Schema({
  userName: { type: String, required: true, index: true },
  sponsor: { type: String, index: true },
  type: {
    type: String,
    enum: ['review', 'transfer', 'campaign_server_fee', 'referral_server_fee', 'beneficiary_fee', 'index_fee',
      'demo_post', 'demo_user_transfer', 'demo_debt'],
    required: true,
  },
  app: { type: String },
  amount: { type: Float, required: true },
  is_demo_account: { type: Boolean, default: false },
  recounted: { type: Boolean, default: false },
  details: { type: Object },
}, {
  timestamps: true,
});

paymentHistorySchema.index({ createdAt: -1 });

const paymentHistoryModel = mongoose.model('paymentHistory', paymentHistorySchema, 'payment_histories');

module.exports = paymentHistoryModel;
