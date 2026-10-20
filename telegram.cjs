// Ayudas para la API de bots de Telegram (sin librerías: fetch y FormData de Node 20+).
// El token va en la variable de entorno TELEGRAM_BOT_TOKEN (secreto de GitHub o .env local), NUNCA en el código.
const fs = require('fs');
const path = require('path');

function api(metodo) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error('Falta TELEGRAM_BOT_TOKEN');
  return `https://api.telegram.org/bot${token}/${metodo}`;
}

async function llamar(metodo, datos) {
  const r = await fetch(api(metodo), datos instanceof FormData
    ? { method: 'POST', body: datos }
    : { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(datos || {}) });
  const j = await r.json();
  // El mensaje de error de Telegram nunca incluye el token
  if (!j.ok) throw new Error(`Telegram ${metodo}: ${j.description}`);
  return j.result;
}

/** Envía las imágenes como álbum; el texto va como pie de la primera (máx. 1024 caracteres). */
async function enviarAlbum(chatId, carpeta, imagenes, texto) {
  const form = new FormData();
  form.append('chat_id', String(chatId));
  const media = imagenes.map((_, i) => ({ type: 'photo', media: `attach://f${i}`, ...(i === 0 && texto ? { caption: texto.slice(0, 1024) } : {}) }));
  form.append('media', JSON.stringify(media));
  imagenes.forEach((img, i) => form.append(`f${i}`, new Blob([fs.readFileSync(path.join(carpeta, img))], { type: 'image/jpeg' }), img));
  return llamar('sendMediaGroup', form);
}

const enviarTexto = (chatId, texto, botones) =>
  llamar('sendMessage', { chat_id: chatId, text: texto, ...(botones ? { reply_markup: { inline_keyboard: botones } } : {}) });

/** Lee las respuestas pendientes (Telegram las guarda 24 h si el bot no usa webhook). */
const leerRespuestas = (offset) => llamar('getUpdates', { offset, allowed_updates: ['callback_query', 'message'], timeout: 0 });

const responderBoton = (id, texto) => llamar('answerCallbackQuery', { callback_query_id: id, text: texto }).catch(() => {});

module.exports = { llamar, enviarAlbum, enviarTexto, leerRespuestas, responderBoton };
