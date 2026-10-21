// Publica un carrusel en Instagram y en la página de Facebook con la API oficial de Meta (Graph API).
// Secretos (GitHub → Settings → Secrets → Actions): META_PAGE_TOKEN, META_PAGE_ID, META_IG_USER_ID.
// Las imágenes se toman de su dirección pública en este repositorio (raw.githubusercontent.com).
// Uso suelto: node meta.cjs --comprobar   (solo revisa que el token y los ids funcionen; no publica nada)
const VERSION = process.env.META_API_VERSION || 'v24.0';
const API = `https://graph.facebook.com/${VERSION}`;
const REPO_RAW = process.env.REPO_RAW || 'https://raw.githubusercontent.com/uninexosoporte-beep/uninexo-redes/main';

const espera = (ms) => new Promise((r) => setTimeout(r, ms));

function metaConfigurado() {
  return Boolean(process.env.META_PAGE_TOKEN && (process.env.META_PAGE_ID || process.env.META_IG_USER_ID));
}

/** Dirección pública de una imagen del post del día. */
function urlImagen(fecha, nombre) {
  return `${REPO_RAW}/salida/${fecha}/${encodeURIComponent(nombre)}`;
}

async function llamar(metodo, ruta, campos = {}) {
  const params = new URLSearchParams({ ...campos, access_token: process.env.META_PAGE_TOKEN });
  const url = metodo === 'GET' ? `${API}/${ruta}?${params}` : `${API}/${ruta}`;
  const r = await fetch(url, metodo === 'GET' ? {} : { method: 'POST', body: params });
  const j = await r.json().catch(() => ({}));
  // Nunca se imprime el token: solo el mensaje de error de Meta
  if (!r.ok || j.error) throw new Error(j.error?.message || `HTTP ${r.status}`);
  return j;
}

/** Espera a que Instagram termine de procesar un contenedor (hasta ~2 min). */
async function esperarListo(id) {
  for (let i = 0; i < 24; i++) {
    const { status_code: estado } = await llamar('GET', id, { fields: 'status_code' });
    if (estado === 'FINISHED') return;
    if (estado === 'ERROR' || estado === 'EXPIRED') throw new Error(`Instagram no aceptó la imagen (${estado})`);
    await espera(5000);
  }
  throw new Error('Instagram tardó demasiado en procesar las imágenes');
}

async function publicarInstagram(urls, texto) {
  const ig = process.env.META_IG_USER_ID;
  if (urls.length < 2 || urls.length > 10) throw new Error('Un carrusel lleva de 2 a 10 imágenes');
  const hijos = [];
  for (const image_url of urls) {
    const { id } = await llamar('POST', `${ig}/media`, { image_url, is_carousel_item: 'true' });
    hijos.push(id);
  }
  for (const h of hijos) await esperarListo(h);
  const { id: carrusel } = await llamar('POST', `${ig}/media`, { media_type: 'CAROUSEL', children: hijos.join(','), caption: texto.slice(0, 2200) });
  await esperarListo(carrusel);
  const { id } = await llamar('POST', `${ig}/media_publish`, { creation_id: carrusel });
  return id;
}

async function publicarFacebook(urls, texto) {
  const pagina = process.env.META_PAGE_ID;
  // Cada foto se sube sin publicar y luego se juntan en una sola publicación
  const fotos = [];
  for (const url of urls) {
    const { id } = await llamar('POST', `${pagina}/photos`, { url, published: 'false' });
    fotos.push(id);
  }
  const campos = { message: texto };
  fotos.forEach((id, i) => { campos[`attached_media[${i}]`] = JSON.stringify({ media_fbid: id }); });
  const { id } = await llamar('POST', `${pagina}/feed`, campos);
  return id;
}

/** Publica en las redes de Meta que tengan su id configurado. Devuelve { hechos, fallos }. */
async function publicarEnMeta(fecha, post) {
  const urls = post.imagenes.map((n) => urlImagen(fecha, n));
  const hechos = [], fallos = [];
  if (process.env.META_IG_USER_ID) {
    try { await publicarInstagram(urls, post.textos.instagram); hechos.push('Instagram'); }
    catch (e) { fallos.push(`Instagram: ${e.message}`); }
  }
  if (process.env.META_PAGE_ID) {
    try { await publicarFacebook(urls, post.textos.facebook); hechos.push('Facebook'); }
    catch (e) { fallos.push(`Facebook: ${e.message}`); }
  }
  return { hechos, fallos };
}

/** Revisa que el token sirva y que los ids sean de las cuentas correctas. No publica nada. */
async function comprobar() {
  if (process.env.META_PAGE_ID) {
    const p = await llamar('GET', process.env.META_PAGE_ID, { fields: 'name' });
    console.log('Página de Facebook:', p.name);
  }
  if (process.env.META_IG_USER_ID) {
    const ig = await llamar('GET', process.env.META_IG_USER_ID, { fields: 'username' });
    console.log('Instagram: @' + ig.username);
    const lim = await llamar('GET', `${process.env.META_IG_USER_ID}/content_publishing_limit`, { fields: 'quota_usage,config' });
    console.log('Publicaciones por API en las últimas 24 h:', JSON.stringify(lim.data?.[0] || lim));
  }
}

module.exports = { metaConfigurado, publicarEnMeta, urlImagen };

if (require.main === module && process.argv.includes('--comprobar')) {
  if (!metaConfigurado()) { console.error('Faltan los secretos META_PAGE_TOKEN y META_PAGE_ID / META_IG_USER_ID'); process.exit(1); }
  comprobar().then(() => console.log('✅ Meta conectado'), (e) => { console.error('❌', e.message); process.exit(1); });
}
