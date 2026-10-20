// Manda el post del día al Telegram PERSONAL del dueño con dos botones: ✅ Publicar / ❌ Saltar.
// Nada se publica sin que él toque «Publicar» (lo revisa publicar.cjs a la hora de publicar).
// Uso: node pedir-aprobacion.cjs [--fecha=AAAA-MM-DD]
const fs = require('fs');
const path = require('path');
const { enviarAlbum, enviarTexto } = require('./telegram.cjs');

const arg = process.argv.find((a) => a.startsWith('--fecha='));
const fecha = arg ? arg.split('=')[1] : new Date(Date.now() - 5 * 3600e3).toISOString().slice(0, 10);
const carpeta = path.join(__dirname, 'salida', fecha);
const admin = process.env.TELEGRAM_ADMIN_CHAT_ID;

(async () => {
  if (!admin) throw new Error('Falta TELEGRAM_ADMIN_CHAT_ID');
  const post = JSON.parse(fs.readFileSync(path.join(carpeta, 'post.json'), 'utf8'));
  await enviarAlbum(admin, carpeta, post.imagenes, post.textos.instagram);
  await enviarTexto(admin,
    `📅 Post del ${fecha} (${post.tipo})\n«${post.titulo}»\n\n¿Lo publico hoy a las 7 p. m. en las redes de UniNexo Perú?`,
    [[{ text: '✅ Publicar', callback_data: `aprobar:${fecha}` }, { text: '❌ Saltar', callback_data: `saltar:${fecha}` }]]);
  console.log('Enviado para aprobación:', fecha);
})().catch((e) => { console.error('Error:', e.message); process.exit(1); });
