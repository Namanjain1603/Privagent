/**
 * PRIVAGENT - Privacy-First Visual Browser Agent (SIH 2026)
 * Member 4 Module: OCR & Vision
 * 
 * SYNTHETIC TEST IMAGE GENERATOR
 * Generates synthetic UI screenshots using standard HTML5 Canvas.
 * No real personal identifiable information (PII) is used; all data is strictly synthetic.
 */

export interface SyntheticPreset {
  id: string;
  name: string;
  description: string;
  generate: () => HTMLCanvasElement;
}

/**
 * Creates a synthetic web form screenshot with mock profile fields
 */
export function generateSyntheticWebForm(): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = 960;
  canvas.height = 640;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  // Background
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Browser Top Bar Mock
  ctx.fillStyle = '#e2e8f0';
  ctx.fillRect(0, 0, canvas.width, 42);

  // Window dots
  ctx.fillStyle = '#ef4444';
  ctx.beginPath();
  ctx.arc(20, 21, 6, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#eab308';
  ctx.beginPath();
  ctx.arc(38, 21, 6, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#22c55e';
  ctx.beginPath();
  ctx.arc(56, 21, 6, 0, Math.PI * 2);
  ctx.fill();

  // URL Bar
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(90, 8, 780, 26);
  ctx.strokeStyle = '#cbd5e1';
  ctx.strokeRect(90, 8, 780, 26);
  ctx.fillStyle = '#475569';
  ctx.font = '13px monospace';
  ctx.fillText('https://portal.internal.example.org/account/kyc-verification', 105, 25);

  // Main Form Card
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(60, 70, 840, 520);
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 1;
  ctx.strokeRect(60, 70, 840, 520);

  // Title
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 24px sans-serif';
  ctx.fillText('Enterprise Verification Portal', 95, 115);

  ctx.fillStyle = '#64748b';
  ctx.font = '14px sans-serif';
  ctx.fillText('Synthetic test document for PRIVAGENT local OCR & Vision evaluation', 95, 140);

  // Divider
  ctx.strokeStyle = '#e2e8f0';
  ctx.beginPath();
  ctx.moveTo(95, 160);
  ctx.lineTo(845, 160);
  ctx.stroke();

  // Fields
  const drawField = (label: string, value: string, x: number, y: number, w: number) => {
    ctx.fillStyle = '#334155';
    ctx.font = 'bold 13px sans-serif';
    ctx.fillText(label, x, y);

    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(x, y + 8, w, 38);
    ctx.strokeStyle = '#cbd5e1';
    ctx.strokeRect(x, y + 8, w, 38);

    ctx.fillStyle = '#0f172a';
    ctx.font = '15px monospace';
    ctx.fillText(value, x + 12, y + 33);
  };

  // Row 1
  drawField('Full Name (Synthetic)', 'Aditi S. Sharma', 95, 180, 340);
  drawField('Account Email', 'aditi.sharma99@example.org', 475, 180, 370);

  // Row 2
  drawField('Registered Mobile', '+91 98765 43210', 95, 260, 340);
  drawField('Verification PAN Pattern', 'ABCDE1234F', 475, 260, 370);

  // Row 3
  drawField('Synthetic Aadhaar Number', '4589 1234 9876', 95, 340, 340);
  drawField('Internal Employee ID', 'EMP-2026-SIH-912', 475, 340, 370);

  // Notice Box
  ctx.fillStyle = '#eff6ff';
  ctx.fillRect(95, 420, 750, 60);
  ctx.strokeStyle = '#bfdbfe';
  ctx.strokeRect(95, 420, 750, 60);

  ctx.fillStyle = '#1e40af';
  ctx.font = '13px sans-serif';
  ctx.fillText('Notice: This portal displays confidential verification records.', 115, 445);
  ctx.fillStyle = '#3b82f6';
  ctx.fillText('All information rendered above is computer-generated synthetic test telemetry.', 115, 465);

  // Action Buttons
  ctx.fillStyle = '#2563eb';
  ctx.fillRect(95, 510, 150, 42);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 14px sans-serif';
  ctx.fillText('Submit Review', 118, 536);

  ctx.fillStyle = '#f1f5f9';
  ctx.fillRect(265, 510, 110, 42);
  ctx.fillStyle = '#475569';
  ctx.fillText('Cancel', 298, 536);

  return canvas;
}

/**
 * Creates a synthetic e-commerce invoice/order summary
 */
export function generateSyntheticInvoice(): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = 900;
  canvas.height = 680;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Header band
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, canvas.width, 80);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 22px sans-serif';
  ctx.fillText('PRIVAGENT BROWSER STORE', 50, 45);

  ctx.fillStyle = '#94a3b8';
  ctx.font = '13px monospace';
  ctx.fillText('ORDER INVOICE: #ORD-77291-SIH', 50, 65);

  ctx.fillStyle = '#38bdf8';
  ctx.font = '14px sans-serif';
  ctx.fillText('STATUS: PAID (SYNTHETIC)', 680, 48);

  // Invoice Details
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 15px sans-serif';
  ctx.fillText('Billing Details:', 50, 120);

  ctx.fillStyle = '#475569';
  ctx.font = '14px sans-serif';
  ctx.fillText('Customer: Rohan Mehta', 50, 145);
  ctx.fillText('Email: rohan.mehta.test@domain.in', 50, 168);
  ctx.fillText('Billing Address: Flat 402, Green Avenue, Pune, Maharashtra 411001', 50, 191);
  ctx.fillText('Contact Number: +91 87654 32109', 50, 214);

  // Table header
  ctx.fillStyle = '#f1f5f9';
  ctx.fillRect(50, 250, 800, 35);
  ctx.fillStyle = '#1e293b';
  ctx.font = 'bold 13px sans-serif';
  ctx.fillText('ITEM DESCRIPTION', 65, 272);
  ctx.fillText('QTY', 520, 272);
  ctx.fillText('UNIT PRICE', 620, 272);
  ctx.fillText('TOTAL', 760, 272);

  // Items
  const drawRow = (desc: string, qty: string, price: string, total: string, y: number) => {
    ctx.fillStyle = '#334155';
    ctx.font = '14px sans-serif';
    ctx.fillText(desc, 65, y);
    ctx.fillText(qty, 530, y);
    ctx.fillText(price, 630, y);
    ctx.fillText(total, 765, y);

    ctx.strokeStyle = '#e2e8f0';
    ctx.beginPath();
    ctx.moveTo(50, y + 15);
    ctx.lineTo(850, y + 15);
    ctx.stroke();
  };

  drawRow('Optical Character Recognition Sandbox Kit', '1', '$149.00', '$149.00', 315);
  drawRow('Privacy Guard Redaction Policy Engine', '2', '$45.00', '$90.00', 360);
  drawRow('Browser Agent Vision Adapter Token', '1', '$25.00', '$25.00', 405);

  // Subtotal & Card info
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 15px sans-serif';
  ctx.fillText('Payment Reference:', 50, 470);

  ctx.fillStyle = '#64748b';
  ctx.font = '14px monospace';
  ctx.fillText('Processed via TestCard: 4111 2222 3333 4444', 50, 495);
  ctx.fillText('Auth Transaction ID: TXN-9988220011', 50, 518);

  ctx.fillStyle = '#1e293b';
  ctx.font = 'bold 18px sans-serif';
  ctx.fillText('Grand Total: $264.00', 640, 485);

  // Footer
  ctx.fillStyle = '#94a3b8';
  ctx.font = '12px sans-serif';
  ctx.fillText('Member 4 Synthetic Benchmark Dataset • SIH 2026 Problem Statement SIH26171', 50, 640);

  return canvas;
}

export const SYNTHETIC_PRESETS: SyntheticPreset[] = [
  {
    id: 'web-form',
    name: 'KYC & Verification Form',
    description: 'Includes mock name, email, Indian mobile, PAN pattern, and Aadhaar format',
    generate: generateSyntheticWebForm
  },
  {
    id: 'invoice',
    name: 'E-Commerce Invoice Order',
    description: 'Includes order details, items table, customer email, phone, and test card format',
    generate: generateSyntheticInvoice
  }
];
