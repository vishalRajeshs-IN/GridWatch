import mongoose from 'mongoose';

const { Schema, model } = mongoose;

const userSchema = new Schema({
  name: { type: String, required: true, trim: true, maxlength: 100 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ['consumer', 'technician', 'operator', 'admin'], default: 'consumer' }
}, { timestamps: true });

const assetSchema = new Schema({
  assetId: { type: String, required: true, unique: true },
  type: { type: String, enum: ['substation', 'transformer', 'pole', 'feeder'], required: true },
  name: { type: String, required: true },
  status: { type: String, enum: ['normal', 'maintenance', 'fault', 'offline'], default: 'normal' },
  voltage: String,
  area: String,
  coordinates: { lat: Number, lng: Number },
  demo: { type: Boolean, default: true }
}, { timestamps: true });

const outageSchema = new Schema({
  title: { type: String, required: true, maxlength: 160 },
  area: { type: String, required: true, maxlength: 160 },
  feeder: String,
  reason: { type: String, enum: ['Scheduled maintenance', 'Feeder trip', 'Transformer fault', 'Storm/weather', 'Emergency repair', 'Unknown'], default: 'Unknown' },
  status: { type: String, enum: ['planned', 'active', 'restored'], default: 'active' },
  startedAt: { type: Date, default: Date.now },
  estimatedRestoration: Date,
  notes: { type: String, maxlength: 1000 },
  source: { type: String, enum: ['manual', 'integration'], default: 'manual' },
  demo: { type: Boolean, default: true },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

const complaintSchema = new Schema({
  reference: { type: String, unique: true, required: true },
  reporter: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['Damaged pole', 'Broken/fallen wire', 'Transformer fault', 'Power outage', 'Sparking/exposed conductor', 'Other'], required: true },
  description: { type: String, required: true, maxlength: 2000 },
  location: { type: String, required: true, maxlength: 250 },
  coordinates: { lat: Number, lng: Number },
  photoPath: String,
  status: { type: String, enum: ['submitted', 'verified', 'assigned', 'in-progress', 'resolved', 'rejected'], default: 'submitted' },
  priority: { type: String, enum: ['low', 'normal', 'high', 'urgent'], default: 'normal' },
  assignedTo: { type: Schema.Types.ObjectId, ref: 'User' },
  staffNotes: { type: String, maxlength: 2000 },
  demo: { type: Boolean, default: false }
}, { timestamps: true });

export const User = model('User', userSchema);
export const Asset = model('Asset', assetSchema);
export const Outage = model('Outage', outageSchema);
export const Complaint = model('Complaint', complaintSchema);


const meterReadingSchema = new Schema({
  meterId: { type: String, required: true, index: true },
  consumer: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  readingKwh: { type: Number, required: true, min: 0 },
  voltage: Number,
  current: Number,
  powerKw: Number,
  recordedAt: { type: Date, default: Date.now },
  source: { type: String, enum: ['manual', 'device', 'demo'], default: 'demo' }
}, { timestamps: true });

const billSchema = new Schema({
  billId: { type: String, required: true, unique: true },
  consumer: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  meterId: { type: String, required: true },
  billingPeriod: { type: String, required: true },
  previousReadingKwh: { type: Number, required: true, min: 0 },
  currentReadingKwh: { type: Number, required: true, min: 0 },
  units: { type: Number, required: true, min: 0 },
  amount: { type: Number, required: true, min: 0 },
  dueDate: Date,
  status: { type: String, enum: ['pending', 'paid'], default: 'pending' },
  paidAt: Date,
  paymentReference: String,
  demo: { type: Boolean, default: true }
}, { timestamps: true });

export const MeterReading = model('MeterReading', meterReadingSchema);
export const Bill = model('Bill', billSchema);
