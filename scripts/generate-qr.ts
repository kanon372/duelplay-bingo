import QRCode from 'qrcode'
import * as fs from 'fs'
import * as path from 'path'

const BASE_URL = 'https://duelplay-bingo.vercel.app/assign'

const CIVILIZATIONS = [
  { name: '光', color: '#b45309', bg: '#fef3c7', emoji: '☀️' },
  { name: '水', color: '#1d4ed8', bg: '#dbeafe', emoji: '💧' },
  { name: '火', color: '#b91c1c', bg: '#fee2e2', emoji: '🔥' },
  { name: '自然', color: '#15803d', bg: '#dcfce7', emoji: '🌿' },
  { name: '闇', color: '#6d28d9', bg: '#ede9fe', emoji: '🌙' },
]

async function generateQRCodes() {
  const qrDataList: { name: string; color: string; bg: string; emoji: string; dataUrl: string }[] = []

  for (const civ of CIVILIZATIONS) {
    const url = `${BASE_URL}/${encodeURIComponent(civ.name)}`
    const dataUrl = await QRCode.toDataURL(url, {
      width: 300,
      margin: 2,
      color: {
        dark: civ.color,
        light: '#ffffff',
      },
    })
    qrDataList.push({ ...civ, dataUrl })
    console.log(`Generated QR for ${civ.name}文明: ${url}`)
  }

  const html = `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>デュエプレビンゴ QRコード</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Helvetica Neue', Arial, sans-serif; background: #1a1a2e; padding: 40px 20px; }
    h1 { text-align: center; color: #ffd700; font-size: 2rem; margin-bottom: 8px; letter-spacing: 4px; text-shadow: 0 0 20px rgba(255,215,0,0.5); }
    .subtitle { text-align: center; color: #aaa; margin-bottom: 40px; font-size: 0.9rem; }
    .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; max-width: 900px; margin: 0 auto; }
    @media (max-width: 600px) { .grid { grid-template-columns: 1fr 1fr; } }
    .card {
      border-radius: 16px;
      padding: 24px 16px;
      text-align: center;
      box-shadow: 0 8px 32px rgba(0,0,0,0.4);
      border: 2px solid rgba(255,255,255,0.1);
    }
    .card h2 { font-size: 1.4rem; margin-bottom: 4px; font-weight: 900; }
    .card .emoji { font-size: 2rem; margin-bottom: 8px; }
    .card img { width: 200px; height: 200px; border-radius: 8px; box-shadow: 0 4px 16px rgba(0,0,0,0.3); }
    .card .label { margin-top: 12px; font-size: 0.75rem; color: rgba(0,0,0,0.5); word-break: break-all; }
    .print-btn {
      display: block; margin: 32px auto 0; padding: 12px 32px;
      background: #ffd700; color: #1a1a2e; border: none; border-radius: 8px;
      font-size: 1rem; font-weight: bold; cursor: pointer; letter-spacing: 1px;
    }
    @media print {
      body { background: white; padding: 10px; }
      h1 { color: #333; text-shadow: none; }
      .grid { gap: 16px; }
      .print-btn { display: none; }
    }
  </style>
</head>
<body>
  <h1>⚔️ BINGO QR</h1>
  <p class="subtitle">デュエルマスターズプレイ バトルキャラバン</p>
  <div class="grid">
    ${qrDataList.map(civ => `
    <div class="card" style="background: ${civ.bg};">
      <div class="emoji">${civ.emoji}</div>
      <h2 style="color: ${civ.color};">${civ.name}文明</h2>
      <img src="${civ.dataUrl}" alt="${civ.name}文明QR" />
      <p class="label">assign/${encodeURIComponent(civ.name)}</p>
    </div>`).join('')}
  </div>
  <button class="print-btn" onclick="window.print()">🖨️ 印刷する</button>
</body>
</html>`

  const outPath = path.resolve(__dirname, '../public/qr-codes.html')
  fs.writeFileSync(outPath, html, 'utf-8')
  console.log(`\nQR codes saved to: public/qr-codes.html`)
  console.log(`Open in browser: file://${outPath}`)
}

generateQRCodes()
