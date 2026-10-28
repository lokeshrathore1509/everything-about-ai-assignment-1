const mongoose = require('mongoose');

const splitDetailSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    amountPaise: {
      type: Number,
      required: true,
      min: 0,
      validate: {
        validator: Number.isInteger,
        message: '{VALUE} is not an integer paise value'
      }
    },
    percentage: {
      type: Number,
      default: 0
    }
  },
  { _id: false }
);

const expenseSchema = new mongoose.Schema(
  {
    group: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Group',
      required: true,
      index: true
    },
    description: {
      type: String,
      required: [true, 'Expense description is required'],
      trim: true,
      minlength: [1, 'Description cannot be empty'],
      maxlength: [200, 'Description cannot exceed 200 characters']
    },
    totalAmountPaise: {
      type: Number,
      required: [true, 'Total amount in paise is required'],
      min: [1, 'Total amount must be at least 1 paise'],
      validate: {
        validator: Number.isInteger,
        message: '{VALUE} must be an integer paise value'
      }
    },
    payer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
      }
    ],
    splitType: {
      type: String,
      enum: ['EQUAL', 'EXACT', 'PERCENTAGE'],
      default: 'EQUAL',
      required: true
    },
    splits: {
      type: [splitDetailSchema],
      required: true,
      validate: {
        validator: function (splits) {
          return splits && splits.length > 0;
        },
        message: 'Expense must have at least one participant split'
      }
    },
    category: {
      type: String,
      enum: ['Food', 'Transportation', 'Entertainment', 'Utilities', 'Shopping', 'Lodging', 'General'],
      default: 'General'
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

// Indexes
expenseSchema.index({ group: 1, date: -1 });
expenseSchema.index({ payer: 1 });

const Expense = mongoose.model('Expense', expenseSchema);
module.exports = Expense;
