const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const PORT = Number(process.env.PORT) || 3000;
const ROOT = __dirname;
const DATA_DIR = path.join(ROOT, 'data');
const DATA_FILE = path.join(DATA_DIR, 'store.json');
const OTP = '123456';
const sessions = new Map();
const roles = ['incharge', 'quality', 'quantity', 'disbursing'];
const stages = ['registration', 'slot-assigned', 'arrived', 'quality-inspection', 'weighing', 'payment-processing', 'payment-completed'];
const stageLabels = { registration: 'Registration', 'slot-assigned': 'Slot Assigned', arrived: 'Arrived at Procurement Center', 'quality-inspection': 'Quality Inspection', weighing: 'Weighing', 'payment-processing': 'Payment Processing', 'payment-completed': 'Payment Completed' };

const defaultStore = {
  farmers: [],
  staff: [
    { employeeId: 'AP-CTR-0231', password: 'password', role: 'incharge', center: 'Kurnool Center' },
    { employeeId: 'AP-QCI-0042', password: 'password', role: 'quality', center: 'Kurnool Center' },
    { employeeId: 'AP-QNI-0018', password: 'password', role: 'quantity', center: 'Kurnool Center' },
    { employeeId: 'AP-DO-0077', password: 'password', role: 'disbursing', center: 'Kurnool Center' }
  ],
  slots: [
    { id: 'slot-18-aug', date: 'Monday, 18 August', time: '08:00 AM - 11:00 AM', center: 'Kurnool Center', capacity: 1000, bookedQuantity: 0, bookedBy: null },
    { id: 'slot-19-aug', date: 'Tuesday, 19 August', time: '08:00 AM - 11:00 AM', center: 'Kurnool Center', capacity: 1000, bookedQuantity: 0, bookedBy: null },
    { id: 'slot-20-aug', date: 'Wednesday, 20 August', time: '02:00 PM - 05:00 PM', center: 'Kurnool Center', capacity: 1000, bookedQuantity: 0, bookedBy: null }
  ],
  notifications: [], history: [], payments: []
};

function now() { return new Date().toISOString(); }
function saveStore(store) { fs.mkdirSync(DATA_DIR, { recursive: true }); fs.writeFileSync(DATA_FILE, JSON.stringify(store, null, 2)); }
function createProcurement(farmer) { return { id: `P-${farmer.id}`, farmerId: farmer.id, center: farmer.center || 'Kurnool Center', crop: farmer.crop || 'Paddy', expectedQuantity: farmer.expectedQuantity || 28, stage: 'registration', history: [{ stage: 'registration', at: farmer.createdAt || now() }], quality: null, quantity: null, payment: null }; }
function loadStore() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const store = fs.existsSync(DATA_FILE) ? JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')) : structuredClone(defaultStore);
  store.notifications ||= []; store.history ||= []; store.payments ||= []; store.farmers ||= [];
  store.staff ||= [];
  store.staff.forEach(staff => { staff.center ||= 'Kurnool Center'; });
  store.farmers.forEach(farmer => { farmer.center ||= 'Kurnool Center'; farmer.crop ||= 'Paddy'; farmer.expectedQuantity ||= 28; farmer.procurement ||= createProcurement(farmer); farmer.procurement.stage ||= 'registration'; farmer.procurement.history ||= [{ stage: 'registration', at: farmer.createdAt || now() }]; });
  store.slots ||= [];
  store.slots.forEach(slot => { slot.capacity ||= 1000; slot.bookings ||= []; if (slot.bookedBy && !slot.bookings.some(booking => booking.farmerId === slot.bookedBy)) slot.bookings.push({ farmerId: slot.bookedBy, quantity: 0 }); const farmer = store.farmers.find(item => item.id === slot.bookedBy); if (farmer && farmer.procurement.stage === 'registration') { farmer.procurement.slotId = slot.id; farmer.procurement.stage = 'slot-assigned'; farmer.status = stageLabels['slot-assigned']; farmer.procurement.history.push({ stage: 'slot-assigned', at: farmer.createdAt || now() }); } slot.bookings.forEach(booking => { const bookedFarmer = store.farmers.find(item => item.id === booking.farmerId); if (bookedFarmer) booking.quantity ||= Number(bookedFarmer.procurement?.bookingQuantity || bookedFarmer.expectedQuantity) || 0; }); slot.bookedQuantity = slot.bookings.reduce((total, booking) => total + (Number(booking.quantity) || 0), 0); });
  saveStore(store); return store;
}
function sendJson(res, status, payload) { res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' }); res.end(JSON.stringify(payload)); }
function sendError(res, status, message) { sendJson(res, status, { error: message }); }
function readJson(req) { return new Promise((resolve, reject) => { let body = ''; req.on('data', chunk => { body += chunk; if (body.length > 1024 * 1024) req.destroy(); }); req.on('end', () => { try { resolve(body ? JSON.parse(body) : {}); } catch { reject(new Error('Request body must be valid JSON.')); } }); req.on('error', reject); }); }
function addEvent(store, farmer, stage, message) { const procurement = farmer.procurement; if (!procurement.history.some(item => item.stage === stage)) procurement.history.push({ stage, at: now() }); procurement.stage = stage; farmer.status = stageLabels[stage]; if (!store.notifications.some(item => item.farmerId === farmer.id && item.stage === stage)) store.notifications.push({ id: crypto.randomUUID(), farmerId: farmer.id, stage, message, read: false, createdAt: now() }); }
function isAccepted(procurement) { return String(procurement.quality?.decision || '').trim().toLowerCase() === 'accepted'; }
function isQualityReady(procurement) {
  if (!procurement) return false;
  const stage = String(procurement.stage || '').trim();
  const arrivedInHistory = Array.isArray(procurement.history) && procurement.history.some(item => String(item.stage || '').trim() === 'arrived');
  return stage === 'arrived' || stage === 'quality-inspection' || arrivedInHistory;
}
function getSession(req) { const header = req.headers.authorization || ''; const token = header.startsWith('Bearer ') ? header.slice(7) : ''; return sessions.get(token); }
function requireRole(req, res, allowed) { const session = getSession(req); if (!session || !allowed.includes(session.role)) { sendError(res, 401, 'You are not authorized for this action.'); return null; } return session; }
function findProcurement(store, id) { return store.farmers.map(farmer => ({ farmer, procurement: farmer.procurement })).find(item => item.procurement.id === id || item.farmer.id === id); }
function serializeProcurement(store, item) { const { farmer, procurement } = item; return { farmer: { id: farmer.id, name: farmer.name, mobile: farmer.mobile, address: farmer.address, aadhaar: farmer.aadhaar, accountNumber: farmer.accountNumber, ifsc: farmer.ifsc, cropCertificateNumber: farmer.cropCertificateNumber }, procurement, payment: procurement.payment || null }; }
function safeFilePath(urlPath) {
  const routePages = [
    [/^\/center-incharge\/farmers\/[^/]+$/, 'staff-farmer-profile.html'],
    [/^\/quantity-inspector\/farmers\/[^/]+$/, 'staff-farmer-profile.html'],
    [/^\/disbursing-officer\/farmers\/[^/]+$/, 'staff-farmer-profile.html'],
    [/^\/center-incharge\/reports$/, 'staff-reports.html'],
    [/^\/disbursing-officer\/reports$/, 'staff-reports.html']
  ];
  const mappedPage = routePages.find(([pattern]) => pattern.test(urlPath));
  const requested = mappedPage ? mappedPage[1] : (urlPath === '/' ? 'index.html' : urlPath.slice(1));
  const filePath = path.resolve(ROOT, requested);
  return filePath.startsWith(ROOT) ? filePath : null;
}
function serveStatic(res, urlPath) { const filePath = safeFilePath(urlPath); if (!filePath) return sendError(res, 403, 'Forbidden.'); fs.stat(filePath, (error, stats) => { if (error || !stats.isFile()) return sendError(res, 404, 'Page not found.'); const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8' }; res.writeHead(200, { 'Content-Type': types[path.extname(filePath)] || 'application/octet-stream' }); fs.createReadStream(filePath).pipe(res); }); }

async function api(req, res, url) {
  const store = loadStore(); const method = req.method; const pathname = url.pathname; let body = {};
  if (method === 'POST' || method === 'PATCH') { try { body = await readJson(req); } catch (error) { return sendError(res, 400, error.message); } }
  if (method === 'POST' && pathname === '/api/auth/farmer/request-otp') { if (!/^\d{10}$/.test(String(body.mobile || ''))) return sendError(res, 400, 'Enter a valid 10-digit mobile number.'); return sendJson(res, 200, { message: 'OTP sent.', developmentOtp: OTP }); }
  if (method === 'POST' && pathname === '/api/auth/farmer/verify-otp') { const mobile = String(body.mobile || ''); if (!/^\d{10}$/.test(mobile) || String(body.otp || '') !== OTP) return sendError(res, 401, 'Invalid mobile number or OTP.'); let farmer = store.farmers.find(item => item.mobile === mobile); if (!farmer) { farmer = { id: `F-${1048 + store.farmers.length}`, mobile, name: 'Farmer', center: 'Kurnool Center', crop: 'Paddy', expectedQuantity: 28, status: 'Registration', createdAt: now(), procurement: null }; farmer.procurement = createProcurement(farmer); store.farmers.push(farmer); addEvent(store, farmer, 'registration', 'Your crop procurement registration has been completed.'); saveStore(store); } const token = crypto.randomUUID(); sessions.set(token, { type: 'farmer', role: 'farmer', farmerId: farmer.id }); return sendJson(res, 200, { token, farmer }); }
  if (method === 'POST' && pathname === '/api/farmers') { const mobile = String(body.mobile || '').trim(); if (!body.name || !/^\d{10}$/.test(mobile)) return sendError(res, 400, 'Full name and a valid 10-digit mobile number are required.'); if (!body.cropCertificateNumber) return sendError(res, 400, 'Crop Certificate Number is required.'); if (store.farmers.some(item => item.mobile === mobile)) return sendError(res, 409, 'A farmer with this mobile number already exists.'); const farmer = { id: `F-${1048 + store.farmers.length}`, name: String(body.name).trim(), mobile, address: body.address || '', aadhaar: body.aadhaar || '', landPassbook: body.landPassbook || '', cropCertificateNumber: String(body.cropCertificateNumber).trim(), accountNumber: body.accountNumber || '', ifsc: body.ifsc || '', center: 'Kurnool Center', crop: body.crop || 'Paddy', expectedQuantity: Number(body.expectedQuantity) || 28, status: 'Registration', createdAt: now(), procurement: null }; farmer.procurement = createProcurement(farmer); store.farmers.push(farmer); addEvent(store, farmer, 'registration', 'Your crop procurement registration has been completed.'); saveStore(store); return sendJson(res, 201, { farmer }); }
  if (method === 'POST' && pathname === '/api/auth/staff/login') { const employeeId = String(body.employeeId || '').trim(); const requestedRole = String(body.role || '').trim().toLowerCase(); const staff = store.staff.find(item => item.employeeId.toLowerCase() === employeeId.toLowerCase() && item.password === String(body.password || '')); if (!staff) return sendError(res, 401, 'Invalid employee ID or password.'); if (!roles.includes(requestedRole) || staff.role !== requestedRole) return sendError(res, 403, 'The selected role does not match this employee account.'); const token = crypto.randomUUID(); sessions.set(token, { type: 'staff', role: staff.role, employeeId: staff.employeeId, center: staff.center }); return sendJson(res, 200, { token, staff: { employeeId: staff.employeeId, role: staff.role, center: staff.center } }); }
  if (method === 'POST' && pathname === '/api/auth/logout') { const header = req.headers.authorization || ''; const token = header.startsWith('Bearer ') ? header.slice(7) : ''; sessions.delete(token); return sendJson(res, 200, { message: 'Logged out.' }); }
  if (method === 'GET' && pathname === '/api/auth/session') { const session = getSession(req); if (!session) return sendError(res, 401, 'Session expired.'); return sendJson(res, 200, { session }); }

  const farmerDashboard = pathname.match(/^\/api\/farmers\/([^/]+)\/dashboard$/);
  if (method === 'GET' && farmerDashboard) { const session = getSession(req); const key = decodeURIComponent(farmerDashboard[1]); const farmer = store.farmers.find(item => item.id === key || item.mobile === key); if (!session || session.role !== 'farmer' || session.farmerId !== farmer?.id) return sendError(res, 403, 'You can only view your own dashboard.'); const notifications = store.notifications.filter(item => item.farmerId === farmer.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt)); return sendJson(res, 200, { ...serializeProcurement(store, { farmer, procurement: farmer.procurement }), slots: store.slots.map(({ bookedBy, bookings, ...slot }) => ({ ...slot, booked: bookings?.some(booking => booking.farmerId === farmer.id) || bookedBy === farmer.id })), timeline: stages.map(stage => ({ stage, label: stageLabels[stage], completed: farmer.procurement.history.some(item => item.stage === stage), current: farmer.procurement.stage === stage, at: farmer.procurement.history.find(item => item.stage === stage)?.at || null })), notifications }); }
  if (method === 'GET' && pathname === '/api/booking-options') { const session = requireRole(req, res, ['farmer']); if (!session) return; const centers = [...new Set(store.slots.map(slot => slot.center))].map(center => ({ name: center, capacity: store.slots.filter(slot => slot.center === center).reduce((sum, slot) => sum + slot.capacity, 0), bookedQuantity: store.slots.filter(slot => slot.center === center).reduce((sum, slot) => sum + slot.bookedQuantity, 0) })); return sendJson(res, 200, { centers, slots: store.slots.map(slot => ({ id: slot.id, date: slot.date, time: slot.time, center: slot.center, capacity: slot.capacity, bookedQuantity: slot.bookedQuantity, availableQuantity: Math.max(0, slot.capacity - slot.bookedQuantity) })) }); }
  if (method === 'PATCH' && pathname.match(/^\/api\/notifications\/[^/]+\/read$/)) { const session = requireRole(req, res, ['farmer']); if (!session) return; const id = pathname.split('/')[3]; const notification = store.notifications.find(item => item.id === id && item.farmerId === session.farmerId); if (!notification) return sendError(res, 404, 'Notification not found.'); notification.read = true; saveStore(store); return sendJson(res, 200, { notification }); }
  const slotMatch = pathname.match(/^\/api\/slots\/([^/]+)\/book$/); if (method === 'POST' && slotMatch) { const session = requireRole(req, res, ['farmer']); if (!session) return; const slot = store.slots.find(item => item.id === slotMatch[1]); const farmer = store.farmers.find(item => item.id === session.farmerId); const quantity = Number(body.quantity); if (!slot || !farmer) return sendError(res, 404, 'Slot or farmer not found.'); if (!Number.isFinite(quantity) || quantity <= 0) return sendError(res, 400, 'Enter a valid positive quantity.'); const previousSlot = store.slots.find(item => item.id === farmer.procurement.slotId); const previousBooking = previousSlot?.bookings?.find(booking => booking.farmerId === farmer.id); const previousQuantity = Number(previousBooking?.quantity || farmer.procurement.bookingQuantity || farmer.expectedQuantity) || 0; const available = slot.capacity - slot.bookedQuantity + (previousSlot?.id === slot.id ? previousQuantity : 0); if (quantity > available) return sendError(res, 409, `Only ${Math.max(0, available)} quintals are currently available at this procurement center.`); store.slots.forEach(item => { item.bookings = (item.bookings || []).filter(booking => booking.farmerId !== farmer.id); item.bookedQuantity = item.bookings.reduce((total, booking) => total + (Number(booking.quantity) || 0), 0); }); slot.bookings.push({ farmerId: farmer.id, quantity }); slot.bookedBy = farmer.id; slot.bookedQuantity = slot.bookings.reduce((total, booking) => total + (Number(booking.quantity) || 0), 0); farmer.procurement.slotId = slot.id; farmer.procurement.bookingQuantity = quantity; farmer.expectedQuantity = quantity; addEvent(store, farmer, 'slot-assigned', 'Your procurement slot has been assigned.'); saveStore(store); return sendJson(res, 200, { slot: { ...slot, availableQuantity: slot.capacity - slot.bookedQuantity }, procurement: farmer.procurement }); }

  if (pathname === '/api/staff/procurements' && method === 'GET') { const session = requireRole(req, res, roles); if (!session) return; return sendJson(res, 200, { procurements: store.farmers.filter(f => f.center === session.center).map(f => serializeProcurement(store, { farmer: f, procurement: f.procurement })) }); }
  const procurementMatch = pathname.match(/^\/api\/procurements\/([^/]+)$/); if (method === 'GET' && procurementMatch) { const session = requireRole(req, res, ['incharge', 'quantity', 'disbursing']); if (!session) return; const item = findProcurement(store, decodeURIComponent(procurementMatch[1])); if (!item || item.farmer.center !== session.center) return sendError(res, 404, 'Procurement not found.'); return sendJson(res, 200, serializeProcurement(store, item)); }
  const actionMatch = pathname.match(/^\/api\/procurements\/([^/]+)\/(arrive|quality|weigh|payment)$/); if (method === 'POST' && actionMatch) { const action = actionMatch[2]; const neededRole = { arrive: 'incharge', quality: 'quality', weigh: 'quantity', payment: 'disbursing' }[action]; const session = requireRole(req, res, [neededRole]); if (!session) return; const item = findProcurement(store, decodeURIComponent(actionMatch[1])); if (!item || item.farmer.center !== session.center) return sendError(res, 404, 'Procurement not found.'); const { farmer, procurement } = item;
    if (action === 'arrive') { if (procurement.stage === 'arrived') return sendJson(res, 200, serializeProcurement(store, item)); if (procurement.stage !== 'slot-assigned' || !procurement.slotId || !store.slots.some(slot => slot.id === procurement.slotId && (slot.bookings?.some(booking => booking.farmerId === farmer.id) || slot.bookedBy === farmer.id))) return sendError(res, 409, 'Farmer is not eligible to arrive. A valid booked slot is required.'); addEvent(store, farmer, 'arrived', 'You have been marked as arrived at the procurement center.'); }
    if (action === 'quality') {
      if (!isQualityReady(procurement)) return sendError(res, 409, 'Procurement is not ready for quality inspection.');
      const decision = String(body.decision || '').trim().toLowerCase();
      if (decision === 'rejected') {
        procurement.quality = { ...body, decision: 'Rejected', at: now() };
        procurement.stage = 'quality-inspection';
        addEvent(store, farmer, 'quality-inspection', 'Quality inspection was completed and the crop was rejected.');
      } else {
        if (decision !== 'accepted' || [body.moisture, body.foreignMatter, body.damaged, body.grade].some(value => value === undefined || value === '')) return sendError(res, 400, 'A valid quality decision and all quality fields are required.');
        procurement.quality = { moisture: Number(body.moisture), foreignMatter: Number(body.foreignMatter), damaged: Number(body.damaged), grade: body.grade, decision: 'Accepted', at: now() };
        procurement.stage = 'quality-inspection';
        addEvent(store, farmer, 'quality-inspection', 'Quality inspection of your crop has been completed.');
      }
    }
    if (action === 'weigh') { if ((procurement.stage !== 'quality-inspection' && !isQualityReady(procurement)) || !isAccepted(procurement)) return sendError(res, 409, 'Only accepted crops can be weighed.'); const weight = Number(body.weight); if (!Number.isFinite(weight) || weight <= 0) return sendError(res, 400, 'Enter a valid positive weight.'); if (procurement.quantity) return sendError(res, 409, 'This procurement has already been weighed.'); procurement.quantity = { weight, at: now() }; addEvent(store, farmer, 'weighing', 'Your crop weighing has been completed.'); }
    if (action === 'payment') { if (procurement.stage !== 'weighing' || !isAccepted(procurement) || !procurement.quantity?.weight) return sendError(res, 409, 'Payment requires an accepted crop with a recorded quantity.'); const amount = Math.round(procurement.quantity.weight * 2203); procurement.payment = { status: 'Processing', amount, rate: 2203, attempts: (procurement.payment?.attempts || 0) + 1, updatedAt: now() }; addEvent(store, farmer, 'payment-processing', 'Your payment is being processed.'); setTimeout(() => { const latest = loadStore(); const found = findProcurement(latest, procurement.id); if (found?.procurement.payment?.status === 'Processing') { found.procurement.payment.status = 'Successful'; found.procurement.payment.txnRef = `TXN-${Date.now().toString().slice(-6)}`; found.procurement.payment.updatedAt = now(); addEvent(latest, found.farmer, 'payment-completed', 'Your payment has been completed successfully.'); saveStore(latest); } }, 600); }
    saveStore(store); return sendJson(res, 200, serializeProcurement(store, item)); }
  if (pathname === '/api/staff/reports' && method === 'GET') { const session = requireRole(req, res, ['incharge', 'disbursing']); if (!session) return; const records = store.farmers.filter(f => f.center === session.center).map(f => serializeProcurement(store, { farmer: f, procurement: f.procurement })); return sendJson(res, 200, { center: session.center, reports: { totalFarmers: records.length, byStage: stages.reduce((result, stage) => ({ ...result, [stage]: records.filter(item => item.procurement.stage === stage).length }), {}), totalQuantity: records.reduce((sum, item) => sum + (item.procurement.quantity?.weight || 0), 0), records } }); }
  if (pathname === '/api/staff/payments' && method === 'GET') { const session = requireRole(req, res, ['disbursing']); if (!session) return; return sendJson(res, 200, { payments: store.farmers.filter(f => f.center === session.center && f.procurement.payment).map(f => serializeProcurement(store, { farmer: f, procurement: f.procurement })) }); }
  const paymentAction = pathname.match(/^\/api\/payments\/([^/]+)\/(status|retry)$/); if (method === 'POST' && paymentAction) { const session = requireRole(req, res, ['disbursing']); if (!session) return; const item = findProcurement(store, decodeURIComponent(paymentAction[1])); if (!item || item.farmer.center !== session.center || !item.procurement.payment) return sendError(res, 404, 'Payment not found.'); if (paymentAction[2] === 'retry') { if (!['Failed', 'Retry Required'].includes(item.procurement.payment.status)) return sendError(res, 409, 'This payment is not eligible for retry.'); item.procurement.payment.status = 'Processing'; item.procurement.payment.attempts++; item.procurement.payment.updatedAt = now(); saveStore(store); setTimeout(() => { const latest = loadStore(); const found = findProcurement(latest, item.procurement.id); if (found) { found.procurement.payment.status = 'Successful'; found.procurement.payment.txnRef = `TXN-${Date.now().toString().slice(-6)}`; found.procurement.payment.updatedAt = now(); addEvent(latest, found.farmer, 'payment-completed', 'Your payment has been completed successfully.'); saveStore(latest); } }, 600); } return sendJson(res, 200, serializeProcurement(store, item)); }
  return sendError(res, 404, 'API route not found.');
}

const server = http.createServer(async (req, res) => { const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`); if (url.pathname.startsWith('/api/')) return api(req, res, url); if (req.method !== 'GET' && req.method !== 'HEAD') return sendError(res, 405, 'Method not allowed.'); serveStatic(res, decodeURIComponent(url.pathname)); });
loadStore(); server.listen(PORT, () => console.log(`SasyaSamanvay running at http://localhost:${PORT}`));