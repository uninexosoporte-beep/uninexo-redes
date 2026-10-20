// Publica el post del día SOLO si el dueño tocó «✅ Publicar» en Telegram (botón de pedir-aprobacion.cjs).
// Redes activas: las que tengan sus secretos configurados. Hoy: canal de Telegram. Meta (Instagram/Facebook/Threads) se suma después.
// Uso: node publicar.cjs [--fecha=AAAA-MM-DD]
const fs = require('fs');
const path = require('path');
const { enviarAlbum, enviarTexto, leerRespuestas, responderBoton } = require('./telegram.cjs');

const arg = process.argv.find((a) => a.startsWith('--fecha='));
const fecha = arg ? arg.split('=')[1] : new Date(Date.now() - 5 * 3600e3).toISOString().slice(0, 10);
const carpeta = path.join(__dirname, 'salida', fecha);
const archivo = path.join(carpeta, 'post.json');
const admin = String(process.env.TELEGRAM_ADMIN_CHAT_ID || '');

(async () => {
  if (!admin) throw new Error('Falta TELEGRAM_ADMIN_CHAT_ID');
  if (!fs.existsSync(archivo)) return console.log('No hay post para', fecha);
  const post = JSON.parse(fs.readFileSync(archivo, 'utf8'));
  if (post.estado !== 'pendiente') return console.log(`El post del ${fecha} ya está «${post.estado}»`);

  // Busca la respuesta del dueño (solo cuenta la de SU cuenta; la de cualquier otra persona se ignora)
  const respuestas = await leerRespuestas();
  let decision = null, ultimo = 0;
  for (const u of respuestas) {
    ultimo = Math.max(ultimo, u.update_id);
    const cb = u.callback_query;
    if (!cb || String(cb.from?.id) !== admin) continue;
    if (cb.data === `aprobar:${fecha}`) decision = 'aprobado';
    if (cb.data === `saltar:${fecha}`) decision = 'saltado';
    await responderBoton(cb.id, 'Recibido 👍');
  }
  if (ultimo) await leerRespuestas(ultimo + 1); // marca las respuestas como leídas

  if (decision !== 'aprobado') {
    post.estado = decision === 'saltado' ? 'saltado' : 'sin_respuesta';
    fs.writeFileSync(archivo, JSON.stringify(post, null, 1));
    await enviarTexto(admin, decision === 'saltado'
      ? `❌ Listo, el post del ${fecha} no se publicó.`
      : `⏸️ No se publicó el post del ${fecha} porque no lo aprobaste. Mañana llega otro.`);
    return console.log('No publicado:', post.estado);
  }

  const hechos = [], fallos = [];
  // 1) Canal de Telegram
  if (process.env.TELEGRAM_CANAL) {
    try { await enviarAlbum(process.env.TELEGRAM_CANAL, carpeta, post.imagenes, post.textos.telegram); hechos.push('Telegram'); }
    catch (e) { fallos.push(`Telegram: ${e.message}`); }
  }
  // 2) Instagram, Facebook y Threads: se agregan cuando estén los secretos de Meta (META_*)

  post.estado = hechos.length ? 'publicado' : 'error';
  post.publicadoEn = hechos;
  fs.writeFileSync(archivo, JSON.stringify(post, null, 1));
  await enviarTexto(admin, [
    hechos.length ? `✅ Publicado en: ${hechos.join(', ')}` : '⚠️ No se pudo publicar en ninguna red.',
    ...fallos.map((f) => `❗ ${f}`),
  ].join('\n'));
  console.log('Resultado:', post.estado, hechos, fallos);
  if (!hechos.length) process.exit(1);
})().catch((e) => { console.error('Error:', e.message); process.exit(1); });
