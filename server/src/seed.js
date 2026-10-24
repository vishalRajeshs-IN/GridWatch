import 'dotenv/config';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { User, Asset, Outage, Complaint, MeterReading, Bill } from './models.js';

if (!process.env.MONGO_URI) throw new Error('Set MONGO_URI in server/.env');
await mongoose.connect(process.env.MONGO_URI);

const passwordHash = await bcrypt.hash('GridWatchDemo123!', 12);
for (const [name, email, role] of [
  ['Demo Operator', 'operator@gridwatch.demo', 'operator'],
  ['Demo Technician', 'technician@gridwatch.demo', 'technician'],
  ['Demo Consumer', 'consumer@gridwatch.demo', 'consumer']
]) {
  await User.updateOne({ email }, { $set: { name, email, role, passwordHash } }, { upsert: true });
}
const assets = [
  { assetId: 'SS-DEMO-01', type: 'substation', name: 'North Demo Substation', status: 'normal', voltage: '33/11 kV', area: 'North Sector', coordinates: { lat: 11.6700, lng: 78.1400 }, demo: true },
  { assetId: 'TX-DEMO-01', type: 'transformer', name: 'Market Road Transformer', status: 'maintenance', voltage: '11/0.433 kV', area: 'Market Road', coordinates: { lat: 11.6750, lng: 78.1500 }, demo: true },
  { assetId: 'TX-DEMO-02', type: 'transformer', name: 'Lake View Transformer', status: 'normal', voltage: '11/0.433 kV', area: 'Lake View', coordinates: { lat: 11.6620, lng: 78.1580 }, demo: true },
  { assetId: 'PL-DEMO-01', type: 'pole', name: 'Pole 01', status: 'normal', area: 'Market Road', coordinates: { lat: 11.6780, lng: 78.1450 }, demo: true },
  { assetId: 'PL-DEMO-02', type: 'pole', name: 'Pole 02', status: 'fault', area: 'Lake View', coordinates: { lat: 11.6600, lng: 78.1510 }, demo: true },
  { assetId: 'FD-DEMO-01', type: 'feeder', name: 'North 11 kV Feeder', status: 'normal', voltage: '11 kV', area: 'North Sector', coordinates: { lat: 11.6680, lng: 78.1470 }, demo: true }
];
for (const asset of assets) await Asset.updateOne({ assetId: asset.assetId }, { $set: asset }, { upsert: true });

const activeOutage = {
  title: 'Scheduled maintenance — demo notice', area: 'Market Road (demo area)', feeder: 'North 11 kV Feeder',
  reason: 'Scheduled maintenance', status: 'planned', startedAt: new Date(Date.now() + 30 * 60000),
  estimatedRestoration: new Date(Date.now() + 3 * 3600000),
  notes: 'Illustrative sample notice only. Not a real shutdown or utility announcement.',
  source: 'manual', demo: true
};
await Outage.updateOne({ title: activeOutage.title }, { $set: activeOutage }, { upsert: true });

await Complaint.updateOne({ reference: 'GW-DEMO-1001' }, { $setOnInsert: {
  reference: 'GW-DEMO-1001', reporter: (await User.findOne({ email: 'consumer@gridwatch.demo' }))._id,
  type: 'Damaged pole', description: 'Illustrative damaged-pole report for demonstration.',
  location: 'Lake View (demo area)', status: 'submitted', priority: 'normal', demo: true
}}, { upsert: true });


const demoConsumer = await User.findOne({ email: 'consumer@gridwatch.demo' });
await MeterReading.updateOne(
  { meterId: 'GW-METER-DEMO-01', consumer: demoConsumer._id, readingKwh: 1284.6 },
  { $setOnInsert: { meterId: 'GW-METER-DEMO-01', consumer: demoConsumer._id, readingKwh: 1284.6, voltage: 230, current: 3.2, powerKw: 0.74, recordedAt: new Date(), source: 'demo' } },
  { upsert: true }
);
await Bill.updateOne(
  { billId: 'GW-BILL-DEMO-2026-10', consumer: demoConsumer._id },
  { $setOnInsert: { billId: 'GW-BILL-DEMO-2026-10', consumer: demoConsumer._id, meterId: 'GW-METER-DEMO-01', billingPeriod: 'October 2026', previousReadingKwh: 1210.2, currentReadingKwh: 1284.6, units: 74.4, amount: 520, dueDate: new Date(Date.now() + 10 * 86400000), status: 'pending', demo: true } },
  { upsert: true }
);

console.log('GridWatch demo data seeded. Demo passwords: GridWatchDemo123!');
await mongoose.disconnect();
