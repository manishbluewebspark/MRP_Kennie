import mongoose from 'mongoose';

const quoteItemSchema = new mongoose.Schema({
  drawingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Drawing', required: true },
  drawingNumber: { type: String, required: true },
  tool: { type: String, required: true },
  unitPrice: { type: Number, required: true, min: 0 },
  quantity: { type: Number, required: true, min: 1, default: 1 },
  totalPrice: { type: Number, required: true, min: 0 },
  currency: { type: mongoose.Schema.Types.ObjectId, ref: "Currency" },
});

const quoteSchema = new mongoose.Schema({
  quoteNumber: { type: String, unique: true, required: true },
  quoteDate: { type: Date, default: Date.now, required: true },

  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
  customerName: { type: String, required: true },
  customerEmail: { type: String, required: true },
  customerCompany: { type: String, required: true },

  items: [quoteItemSchema],

  totalDrawings: { type: Number, required: true, min: 0 },
  totalQuantity: { type: Number, required: true, min: 0 },
  totalQuoteValue: { type: Number, required: true, min: 0 },

  isActive: { type: Boolean, default: true },
  isDeleted: { type: Boolean, default: false },
  status: { type: String, enum: ['quoted','pending'], default: 'pending' },
  isPendingQuotes: { type: Boolean, default: true },
  validUntil: { type: Date, required: true },
  currency: { type: mongoose.Schema.Types.ObjectId, ref: "Currency" },
  created: { type: Date, default: Date.now },
  updated: { type: Date, default: Date.now },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
});

// Pre-save hooks
// quoteSchema.pre('save', async function(next) {
//   if (this.isNew) {
//     const count = await mongoose.model('Quote').countDocuments();
//     this.quoteNumber = `QT-${String(count + 1).padStart(6, '0')}`;
//   }
//   next();
// });

quoteSchema.pre('save', function(next) {
  if (this.items && this.items.length) {
    this.totalDrawings = this.items.length;
    this.totalQuantity = this.items.reduce((sum, i) => sum + i.quantity, 0);
    this.totalQuoteValue = this.items.reduce((sum, i) => sum + i.totalPrice, 0);
  }
  this.updated = Date.now();
  next();
});

quoteItemSchema.pre('save', function(next) {
  this.totalPrice = this.unitPrice * this.quantity;
  next();
});

// Virtuals
quoteSchema.virtual('formattedQuoteDate').get(function() {
  return this.quoteDate.toLocaleDateString('en-US');
});

quoteSchema.virtual('formattedValidUntil').get(function() {
  return this.validUntil.toLocaleDateString('en-US');
});

// Methods
quoteSchema.methods.isExpired = function() {
  return this.validUntil < new Date();
};

// Statics
quoteSchema.statics.getActiveQuotes = function() {
  return this.find({ isActive: true, isDeleted: false });
};

quoteSchema.statics.getQuotesByCustomer = function(customerId) {
  return this.find({ customerId, isDeleted: false }).sort({ created: -1 });
};

const Quote = mongoose.model('Quote', quoteSchema);
export default Quote;
