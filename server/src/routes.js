import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs';
import { randomUUID } from 'node:crypto';
import { User, Asset, Outage, Complaint, MeterReading, Bill } from './models.js';
import { authenticate, allowRoles } from './middleware.js';

const router = Router();
const uploadDir = path.resolve('uploads');
fs.mkdirSync(uploadDir, { recursive: true });
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => cb(null, `${Date.now()}-${randomUUID()}${path.extname(file.originalname).toLowerCase()}`)
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    cb(allowed.includes(file.mimetype) ? null : new Error('Only JPG, PNG, or WEBP images are allowed.'), allowed.includes(file.mimetype));
  }
});

function tokenFor(user) {
  return jwt.sign({ sub: user._id.toString(), role: user.role }, process.env.JWT_SECRET, { expiresIn: '12h' });
}
function publicUser(user) {
  return { id: user._id, name: user.name, email: user.email, role: user.role };
}

router.post('/auth/register', async (req, res, next) => {
  try {
    const { name, email, password } = req.body;
    if (!name?.trim() || !email?.trim() || typeof password !== 'string' || password.length < 10) {
      return res.status(400).json({ message: 'Name, email, and a password of at least 10 characters are required.' });
    }
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) return res.status(409).json({ message: 'An account with this email already exists.' });
    // Public registration can only create consumers. Staff roles are assigned by trusted administrators.
    const user = await User.create({ name: name.trim(), email, passwordHash: await bcrypt.hash(password, 12), role: 'consumer' });
    res.status(201).json({ token: tokenFor(user), user: publicUser(user) });
  } catch (e) { next(e); }
});

router.post('/auth/login', async (req, res, next) => {
  try {
    const user = await User.findOne({ email: String(req.body.email || '').toLowerCase() });
    if (!user || !(await bcrypt.compare(String(req.body.password || ''), user.passwordHash))) {
      return res.status(401).json({ message: 'Email or password is incorrect.' });
    }
    res.json({ token: tokenFor(user), user: publicUser(user) });
  } catch (e) { next(e); }
});

router.get('/auth/me', authenticate, (req, res) => res.json({ user: publicUser(req.user) }));

router.get('/assets', authenticate, async (_req, res, next) => {
  try { res.json(await Asset.find().sort({ type: 1, assetId: 1 })); } catch (e) { next(e); }
});

router.get('/outages', authenticate, async (_req, res, next) => {
  try { res.json(await Outage.find().populate('createdBy', 'name').sort({ createdAt: -1 }).limit(100)); } catch (e) { next(e); }
});

router.post('/outages', authenticate, allowRoles('operator', 'admin'), async (req, res, next) => {
  try {
    const { title, area, reason, status, feeder, estimatedRestoration, notes } = req.body;
    if (!title?.trim() || !area?.trim()) return res.status(400).json({ message: 'Title and affected area are required.' });
    const outage = await Outage.create({
      title: title.trim(), area: area.trim(), reason, status, feeder, notes,
      estimatedRestoration: estimatedRestoration || undefined, source: 'manual', demo: false, createdBy: req.user._id
    });
    res.status(201).json(outage);
  } catch (e) { next(e); }
});

router.patch('/outages/:id/status', authenticate, allowRoles('operator', 'admin'), async (req, res, next) => {
  try {
    const { status, estimatedRestoration, notes } = req.body;
    if (!['planned', 'active', 'restored'].includes(status)) return res.status(400).json({ message: 'Invalid outage status.' });
    const update = { status };
    if (estimatedRestoration !== undefined) update.estimatedRestoration = estimatedRestoration || null;
    if (notes !== undefined) update.notes = String(notes).slice(0, 1000);
    const outage = await Outage.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true });
    if (!outage) return res.status(404).json({ message: 'Outage not found.' });
    res.json(outage);
  } catch (e) { next(e); }
});

router.get('/complaints', authenticate, async (req, res, next) => {
  try {
    const query = ['operator', 'admin', 'technician'].includes(req.user.role) ? {} : { reporter: req.user._id };
    const rows = await Complaint.find(query).populate('reporter', 'name email').populate('assignedTo', 'name').sort({ createdAt: -1 }).limit(200);
    res.json(rows);
  } catch (e) { next(e); }
});

router.post('/complaints', authenticate, upload.single('photo'), async (req, res, next) => {
  try {
    const { type, description, location, lat, lng } = req.body;
    if (!type || !description?.trim() || !location?.trim()) {
      if (req.file) fs.unlink(req.file.path, () => {});
      return res.status(400).json({ message: 'Fault type, description, and location are required.' });
    }
    const coordinates = (lat !== undefined && lng !== undefined && lat !== '' && lng !== '')
      ? { lat: Number(lat), lng: Number(lng) } : undefined;
    const complaint = await Complaint.create({
      reference: `GW-${Date.now().toString().slice(-7)}-${randomUUID().slice(0, 4).toUpperCase()}`,
      reporter: req.user._id, type, description: description.trim(), location: location.trim(),
      coordinates, photoPath: req.file ? `/uploads/${req.file.filename}` : undefined
    });
    res.status(201).json(complaint);
  } catch (e) { next(e); }
});

router.patch('/complaints/:id', authenticate, allowRoles('technician', 'operator', 'admin'), async (req, res, next) => {
  try {
    const allowed = ['submitted', 'verified', 'assigned', 'in-progress', 'resolved', 'rejected'];
    const update = {};
    if (req.body.status !== undefined) {
      if (!allowed.includes(req.body.status)) return res.status(400).json({ message: 'Invalid complaint status.' });
      update.status = req.body.status;
    }
    if (req.body.staffNotes !== undefined) update.staffNotes = String(req.body.staffNotes).slice(0, 2000);
    if (req.body.priority !== undefined) {
      if (!['low', 'normal', 'high', 'urgent'].includes(req.body.priority)) return res.status(400).json({ message: 'Invalid priority.' });
      update.priority = req.body.priority;
    }
    if (req.body.assignedTo) {
      const assignee = await User.findById(req.body.assignedTo);
      if (!assignee || !['technician', 'operator', 'admin'].includes(assignee.role)) return res.status(400).json({ message: 'Assignee must be staff.' });
      update.assignedTo = assignee._id;
    }
    const complaint = await Complaint.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true })
      .populate('reporter', 'name email').populate('assignedTo', 'name');
    if (!complaint) return res.status(404).json({ message: 'Complaint not found.' });
    res.json(complaint);
  } catch (e) { next(e); }
});

export default router;


// Meter values are historical/manual/demo unless a trusted meter gateway is connected.
router.get('/meter', authenticate, async (req, res, next) => {
  try {
    const readings = await MeterReading.find({ consumer: req.user._id }).sort({ recordedAt: -1 }).limit(30);
    res.json({
      meterId: readings[0]?.meterId || 'GW-METER-DEMO-01',
      source: readings[0]?.source || 'demo',
      liveTelemetry: readings[0]?.source === 'device',
      readings
    });
  } catch (e) { next(e); }
});

router.get('/bills', authenticate, async (req, res, next) => {
  try {
    res.json(await Bill.find({ consumer: req.user._id }).sort({ createdAt: -1 }).limit(100));
  } catch (e) { next(e); }
});

// Demo checkout only: this records a simulated payment and is NOT a real money transfer.
router.post('/bills/:id/pay', authenticate, async (req, res, next) => {
  try {
    const bill = await Bill.findOne({ _id: req.params.id, consumer: req.user._id });
    if (!bill) return res.status(404).json({ message: 'Bill not found for this account.' });
    if (bill.status === 'paid') return res.status(409).json({ message: 'This bill is already marked as paid.' });
    bill.status = 'paid';
    bill.paidAt = new Date();
    bill.paymentReference = `GW-DEMO-${randomUUID().slice(0, 8).toUpperCase()}`;
    bill.demo = true;
    await bill.save();
    res.json({ bill, paymentMode: 'simulation', message: 'Demo payment recorded. No money was charged.' });
  } catch (e) { next(e); }
});
