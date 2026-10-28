const mongoose = require('mongoose');

const settlementSchema = new mongoose.Schema(
  {
    group: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Group',
      required: true,
      index: true
    },
    fromUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Payer (fromUser) is required']
    },
    toUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Recipient (toUser) is required']
    },
    amountPaise: {
      type: Number,
      required: [true, 'Settlement amount in paise is required'],
      min: [1, 'Amount must be at least 1 paise'],
      validate: {
        validator: Number.isInteger,
        message: '{VALUE} must be an integer paise value'
      }
    },
    date: {
      type: Date,
      default: Date.now
    },
    notes: {
      type: String,
      trim: true,
      default: '',
      maxlength: [500, 'Notes cannot exceed 500 characters']
    },
    creator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    }
  },
  {
    timestamps: true
  }
);

settlementSchema.index({ group: 1, date: -1 });

const Settlement = mongoose.model('Settlement', settlementSchema);
module.exports = Settlement;
