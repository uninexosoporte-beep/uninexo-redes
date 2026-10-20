// Generador de publicaciones diarias de UniNexo Perú (20/10/2026).
// Toma datos REALES (Firestore público + grupos curados exportados del proyecto) y arma un carrusel de 3 imágenes
// (1080×1350) con sus textos para cada red. NO publica nada: eso lo hace publicar.cjs solo con aprobación.
//
// Uso:
//   node generar.cjs                      → post de hoy (día de Perú)
//   node generar.cjs --fecha=2026-10-21   → post de esa fecha
//   node generar.cjs --semana             → 7 días desde la fecha (vista previa; no guarda historial)
//   node generar.cjs --guardar            → anota lo usado en historial.json para no repetirlo
const fs = require('fs');
const path = require('path');

const RAIZ = __dirname;
const SALIDA = path.join(RAIZ, 'salida');
const HISTORIAL = path.join(RAIZ, 'historial.json');
const FIRESTORE = 'https://firestore.googleapis.com/v1/projects/uninexo-5a753/databases/(default)/documents/';
const SITIO = 'https://uninexo.link';
const LOGO = path.join(RAIZ, 'datos', 'logo.png').replace(/\\/g, '/');
const CURADOS = JSON.parse(fs.readFileSync(path.join(RAIZ, 'datos', 'curados.json'), 'utf8'));

const args = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, v] = a.replace(/^--/, '').split('='); return [k, v ?? true]; }));

// ---------- Utilidades
const hoyPeru = () => new Date(Date.now() - 5 * 3600e3).toISOString().slice(0, 10);
const sumarDias = (f, n) => new Date(Date.parse(f + 'T12:00:00Z') + n * 864e5).toISOString().slice(0, 10);
const diaSemana = (f) => new Date(f + 'T12:00:00Z').getUTCDay(); // 0 = domingo
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const corto = (s, n) => { s = String(s ?? '').trim(); return s.length > n ? s.slice(0, n - 1).trimEnd() + '…' : s; };
const fechaBonita = (f) => { const [a, m, d] = f.split('-'); return `${Number(d)}/${Number(m)}/${a}`; };
// Orden estable pero «mezclado» por id (siempre igual para los mismos datos)
const hash = (s) => { let h = 2166136261; for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0; return h; };
const mezclar = (lista) => [...lista].sort((a, b) => hash(a.id) - hash(b.id));

function valor(v) {
  const k = Object.keys(v)[0]; const x = v[k];
  if (k === 'mapValue') return Object.fromEntries(Object.entries(x.fields || {}).map(([a, b]) => [a, valor(b)]));
  if (k === 'arrayValue') return (x.values || []).map(valor);
  if (k === 'integerValue') return Number(x);
  return x;
}
async function coleccion(nombre) {
  const docs = []; let token = '';
  do {
    const r = await fetch(`${FIRESTORE}${nombre}?pageSize=300${token ? '&pageToken=' + token : ''}`);
    if (!r.ok) throw new Error(`Firestore ${nombre}: ${r.status}`);
    const j = await r.json();
    for (const d of j.documents || []) docs.push({ id: d.name.split('/').pop(), ...Object.fromEntries(Object.entries(d.fields || {}).map(([k, v]) => [k, valor(v)])) });
    token = j.nextPageToken || '';
  } while (token);
  return docs;
}

// ---------- Plantillas (mismo estilo que los carruseles de marca/instagram)
const BASE = `*{box-sizing:border-box} html,body{margin:0;width:1080px;height:1350px;overflow:hidden;font-family:'Segoe UI','Noto Sans',Arial,sans-serif;color:#fff}
body{background:radial-gradient(45% 35% at 15% 15%,rgba(124,58,237,.65),transparent 70%),radial-gradient(45% 35% at 90% 85%,rgba(251,191,36,.35),transparent 70%),linear-gradient(160deg,#1e1b4b,#0f0b2e 60%,#140a33);position:relative}
.grad{background:linear-gradient(90deg,#c4b5fd,#fcd34d);-webkit-background-clip:text;color:transparent}
.marca{position:absolute;left:60px;bottom:50px;display:flex;align-items:center;gap:18px;font-weight:800;font-size:36px}
.marca img{width:64px;height:64px;border-radius:16px} .marca small{display:block;font-size:26px;font-weight:700;opacity:.75}
.pe{color:#fcd34d} .num{position:absolute;right:60px;bottom:58px;font-weight:800;font-size:32px;color:rgba(255,255,255,.6)}
.chip{display:inline-block;padding:14px 34px;border-radius:999px;background:rgba(255,255,255,.12);border:2px solid rgba(255,255,255,.25);font-size:38px;font-weight:800}`;
const marca = `<div class="marca"><img src="file:///${LOGO}"><div>UniNexo <span class="pe">Perú</span><small>uninexo.link</small></div></div>`;
const pagina = (css, cuerpo, n) => `<html><head><meta charset="utf-8"><style>${BASE}${css}</style></head><body>${cuerpo}${marca}<div class="num">${n}/3</div></body></html>`;

const portada = (p) => pagina(`
  .e{position:absolute;left:60px;top:110px;font-size:36px;font-weight:900;letter-spacing:3px;color:${p.color}}
  .ic{position:absolute;right:70px;top:80px;font-size:170px}
  .bl{position:absolute;left:60px;right:60px;top:330px}
  .t{font-weight:900;font-size:${p.titulo.length > 60 ? 76 : p.titulo.length > 30 ? 92 : p.titulo.length > 8 ? 120 : 230}px;line-height:1.05}
  .s{margin-top:40px;font-size:46px;font-weight:600;color:#e9d5ff;line-height:1.3}
  .d{position:absolute;left:60px;top:1080px}`,
  `<div class="e">${esc(p.etiqueta)}</div><div class="ic">${p.icono}</div>
   <div class="bl"><div class="t">${p.tituloHtml ?? esc(p.titulo)}</div><div class="s">${esc(p.sub)}</div></div>
   <div class="d"><span class="chip">Desliza 👉</span></div>`, 1);

const detalle = (p) => pagina(`
  .t{position:absolute;left:60px;right:60px;top:90px;font-weight:900;font-size:64px;line-height:1.08}
  .l{position:absolute;left:60px;right:60px;top:${p.detalleTitulo.length > 40 ? 330 : 270}px;display:flex;flex-direction:column;gap:24px}
  .i{display:flex;gap:26px;align-items:center;padding:30px 34px;border-radius:30px;background:rgba(255,255,255,.08);border:2px solid rgba(255,255,255,.14);font-size:42px;font-weight:700;line-height:1.25}
  .i span{font-size:52px}`,
  `<div class="t">${esc(p.detalleTitulo)}</div><div class="l">${p.filas.map(([e, t]) => `<div class="i"><span>${e}</span><div>${esc(t)}</div></div>`).join('')}</div>`, 2);

const cierre = (p) => pagina(`
  .logo{position:absolute;left:50%;top:180px;width:340px;margin-left:-170px;border-radius:80px;box-shadow:0 30px 100px rgba(124,58,237,.65)}
  .p{position:absolute;left:0;right:0;top:575px;text-align:center;font-weight:900;font-size:56px}
  .u{position:absolute;left:0;right:0;top:650px;text-align:center;font-weight:900;font-size:110px}
  .l{position:absolute;left:60px;right:60px;top:820px;text-align:center;font-weight:800;font-size:46px;line-height:1.25}
  .c{position:absolute;left:0;right:0;top:1040px;text-align:center}`,
  `<img class="logo" src="file:///${LOGO}"><div class="p">UniNexo <span class="pe">Perú</span></div><div class="u grad">uninexo.link</div>
   <div class="l">${esc(p.cierre)}</div><div class="c"><span class="chip">👉 Link en la bio</span></div>`, 3);

// ---------- Los 7 tipos de post (uno por día de la semana)
const HASH_BASE = ['#uninexo', '#universitariosperu'];
const CONSEJOS = [
  ['Ningún grupo real te pide plata', 'Si te cobran por entrar a un grupo de estudio o te «aseguran la vacante», es estafa.', ['🚩', 'Nadie vende vacantes: solo vale tu examen'], ['💸', 'Los grupos de estudio son gratis'], ['📢', 'Si ves una estafa, repórtala']],
  ['Nunca compartas el código que te llega por SMS', 'Ese código es tu WhatsApp. Si lo das, te roban la cuenta y escriben a tus contactos.', ['🔐', 'Activa la verificación en dos pasos de WhatsApp'], ['📵', 'Nadie «se equivocó» al mandarte un código'], ['👀', 'Avisa en tu grupo si a alguien le pasó']],
  ['Revisa quién administra el grupo', 'Antes de unirte, mira si es oficial de la universidad o lo creó un estudiante.', ['✅', 'En UniNexo cada grupo dice quién lo administra'], ['🏛️', 'Los canales oficiales los publica la propia universidad'], ['🤔', 'Desconfía de grupos que piden datos personales']],
  ['Cuidado con las «becas» que piden pago', 'Las becas reales del Estado no cobran por postular. Revisa siempre la web oficial.', ['🎓', 'Pronabec publica sus becas en gob.pe'], ['💳', 'Nunca des datos de tu tarjeta para «reservar» una beca'], ['🔗', 'Entra solo por enlaces oficiales']],
];

async function construir(tipo, fecha, datos, usados) {
  const libre = (lista) => mezclar(lista).find((x) => !usados.has(x.id)) || mezclar(lista)[0];
  const uni = (id) => CURADOS.universidades.find((u) => u.id === id);

  if (tipo === 'academia') {
    const a = libre(datos.academias);
    const sedes = Array.isArray(a.sedes) ? a.sedes : [];
    const unis = Array.isArray(a.universidades) ? a.universidades : [];
    return { id: a.id, p: {
      etiqueta: '🏫 ACADEMIA DEL DÍA', color: '#fcd34d', icono: '📍', titulo: a.nombre, sub: `${a.region} · Prepara para ${unis.slice(0, 3).join(', ') || 'universidades del Perú'}`,
      detalleTitulo: '¿Qué tiene?', filas: [
        ['📍', `${a.region}${sedes[0] ? ' · ' + corto(sedes[0], 70) : ''}`],
        ['🎯', `Prepara para: ${unis.slice(0, 5).join(', ') || 'consulta en su web'}`],
        ['📝', corto(a.nota || 'Datos tomados de su web oficial.', 110)],
        ['💬', 'WhatsApp y web oficial en uninexo.link → Academia'],
      ], cierre: `Mira las 71 academias de todo el Perú 🏫` },
      texto: `🏫 Academia del día: ${a.nombre} (${a.region})\n\n🎯 Prepara para: ${unis.slice(0, 5).join(', ') || 'universidades del Perú'}\n\nEn UniNexo Perú tienes academias de todas las regiones, con su web y WhatsApp oficial 👉 ${SITIO}/academia\n\n¿Ya sabes en qué academia te vas a preparar? 👇`,
      tags: ['#academiapreuniversitaria', '#admision', `#${String(a.region).toLowerCase().replace(/[^a-záéíóúñ]/g, '')}`] };
  }

  if (tipo === 'convocatoria') {
    const limite = sumarDias(fecha, 3);
    const abiertas = datos.convocatorias.filter((c) => c.estado !== 'cerrada' && c.fechaCierre >= limite && c.enlaceOficial);
    // Sin convocatorias abiertas (se vencen solas): ese día sale un curso o beca, nunca una convocatoria cerrada
    if (!abiertas.length) {
      console.warn(`  ⚠️ ${fecha}: no hay convocatorias que cierren después del ${limite}; uso un curso o beca`);
      return construir('curso', fecha, datos, usados);
    }
    const c = libre(abiertas);
    return { id: c.id, p: {
      etiqueta: `💼 ${c.tipo === 'Prácticas' ? 'PRÁCTICAS' : 'EMPLEO'} DEL ESTADO`, color: '#86efac', icono: '💼', titulo: c.cargo || c.titulo,
      sub: `${c.institucion} · ${c.departamento}`, detalleTitulo: 'Lo que tienes que saber', filas: [
        ['🏛️', corto(c.institucion, 80)], ['📍', `${c.departamento}${c.distrito ? ' · ' + c.distrito : ''}`],
        ['💰', `${c.sueldo || 'Sueldo según bases'} · ${c.tipo || 'Convocatoria'}`], ['📅', `Postula hasta el ${fechaBonita(c.fechaCierre)}`],
      ], cierre: 'Más prácticas y empleos del Estado, con su enlace oficial 💼' },
      texto: `💼 ${c.cargo || c.titulo}\n🏛️ ${c.institucion}\n📍 ${c.departamento}\n💰 ${c.sueldo || 'Sueldo según bases'}\n📅 Cierra el ${fechaBonita(c.fechaCierre)}\n\nRevisa las bases en el enlace oficial. Más convocatorias 👉 ${SITIO}/empleos-estado\n\n⚠️ Postular al Estado es gratis: nadie te puede cobrar.`,
      tags: ['#empleosperu', '#convocatoriascas', '#practicas'] };
  }

  if (tipo === 'comunidad') {
    const lista = CURADOS.grupos.filter((g) => g.universityId === 'general' && g.carrera && g.carrera !== 'Todas las carreras');
    const g = libre(lista);
    const red = { facebook: 'Facebook', whatsapp: 'WhatsApp', telegram: 'Telegram', discord: 'Discord' }[g.platform];
    return { id: g.id, p: {
      etiqueta: `👥 COMUNIDAD DE ${String(g.carrera).toUpperCase()}`, color: '#c4b5fd', icono: '👥', titulo: g.title, sub: `Grupo de ${red} para estudiantes de ${g.carrera}`,
      detalleTitulo: '¿De qué trata?', filas: [
        ['💬', corto(g.description, 120)], ['🛡️', `Administra: ${corto(g.administra, 70)}`], ['🏷️', g.etiqueta],
      ], cierre: `Busca la comunidad de tu carrera 👥` },
      texto: `👥 ¿Estudias ${g.carrera}? Hay una comunidad para ti\n\n«${g.title}» (${red})\n${corto(g.description, 200)}\n\nEncuéntrala junto con otras comunidades de tu carrera 👉 ${SITIO}/?tab=grupos\n\n📲 Etiqueta a un compañero de ${g.carrera}`,
      tags: ['#gruposdeestudio', '#comunidaduniversitaria'] };
  }

  if (tipo === 'curso') {
    const c = libre(datos.cursos.filter((x) => x.active !== false && x.gratuito === true && x.enlaceOficial));
    const TIPO = { curso: 'CURSO GRATIS', beca: 'BECA', voluntariado: 'VOLUNTARIADO', webinar: 'WEBINAR', taller: 'TALLER', certificacion: 'CERTIFICACIÓN', especializacion: 'ESPECIALIZACIÓN', experiencia_laboral: 'EXPERIENCIA LABORAL' };
    return { id: c.id, p: {
      etiqueta: `📚 ${TIPO[c.tipo] || 'OPORTUNIDAD'} DEL DÍA`, color: '#93c5fd', icono: '📚', titulo: c.name, sub: c.institucion || '',
      detalleTitulo: 'Lo que tienes que saber', filas: [
        ['🏛️', corto(c.institucion, 80)], ['🧭', `${c.area || 'Varias carreras'} · ${c.modalidad || 'virtual'}`],
        ['🆓', 'Gratis'], ['📝', corto(c.description, 110)],
      ], cierre: 'Más de 100 cursos y becas gratis 📚' },
      texto: `📚 ${c.name}\n🏛️ ${c.institucion}\n🆓 Gratis · ${c.modalidad || 'virtual'}\n\n${corto(c.description, 220)}\n\nMás cursos y becas gratis 👉 ${SITIO}/cursos`,
      tags: ['#cursosgratis', '#becas'] };
  }

  if (tipo === 'seguridad') {
    const i = Math.floor(Date.parse(fecha) / (7 * 864e5)) % CONSEJOS.length;
    const [titulo, sub, ...filas] = CONSEJOS[i];
    return { id: 'consejo-' + i, p: {
      etiqueta: '🛡️ CONSEJO DE SEGURIDAD', color: '#fca5a5', icono: '🛡️', titulo, sub, detalleTitulo: 'Para cuidarte', filas,
      cierre: 'Antes de entrar a un grupo, UniNexo te avisa 🛡️' },
      texto: `🛡️ ${titulo}\n\n${sub}\n\n${filas.map(([e, t]) => `${e} ${t}`).join('\n')}\n\nComparte esto con un cachimbo 🙌\n👉 ${SITIO}`,
      tags: ['#cachimbos', '#estafas'] };
  }

  if (tipo === 'universidad') {
    const conteo = {};
    for (const g of CURADOS.grupos) if (g.universityId !== 'general') conteo[g.universityId] = (conteo[g.universityId] || 0) + 1;
    const candidatos = Object.entries(conteo).filter(([, n]) => n >= 3).map(([id]) => ({ id }));
    const { id } = libre(candidatos);
    const u = uni(id);
    const grupos = CURADOS.grupos.filter((g) => g.universityId === id);
    return { id, p: {
      etiqueta: '🎓 UNIVERSIDAD DEL DÍA', color: '#fcd34d', icono: '🎓', titulo: u.sigla, tituloHtml: `<span class="grad">${esc(u.sigla)}</span>`, sub: u.nombre,
      detalleTitulo: `${grupos.length} grupos y canales`, filas: grupos.slice(0, 4).map((g) => [g.origen === 'oficial' ? '🏛️' : '👥', corto(g.title, 70)]),
      cierre: `¿Estudias en la ${u.sigla}? Encuentra tus grupos 🎓` },
      texto: `🎓 ¿Estudias en la ${u.sigla}?\n${u.nombre}\n\nEn UniNexo Perú tienes ${grupos.length} grupos y canales de tu universidad, cada uno con quién lo administra 👉 ${SITIO}/?tab=grupos&uni=${id}\n\n📲 Etiqueta a alguien de la ${u.sigla}`,
      tags: [`#${u.sigla.toLowerCase().replace(/[^a-z]/g, '')}`, '#gruposdeestudio'] };
  }

  // material (domingo): exámenes de admisión primero
  const examenes = datos.materiales.filter((m) => m.type === 'examen');
  const m = libre(examenes.length ? examenes : datos.materiales);
  const u = uni(m.universityId);
  return { id: m.id, p: {
    etiqueta: '📝 MATERIAL DEL DÍA', color: '#fdba74', icono: '📝', titulo: m.title, sub: u ? u.nombre : 'Para todas las universidades',
    detalleTitulo: 'Para practicar', filas: [
      ['🎓', u ? u.sigla : 'Todas las universidades'], ['📚', corto(m.courseName || m.carrera || 'Admisión', 70)], ['🔗', 'Gratis, con su fuente'], ['📝', corto(m.description, 100)],
    ], cierre: 'Exámenes de admisión, guías y libros gratis 📝' },
    texto: `📝 ${m.title}\n${u ? '🎓 ' + u.nombre + '\n' : ''}\nGratis y con su fuente 👉 ${SITIO}/?tab=materiales\n\n📌 Guárdalo para practicar`,
    tags: ['#examendeadmision', '#postulantes'] };
}

const TIPO_POR_DIA = ['material', 'academia', 'convocatoria', 'comunidad', 'curso', 'seguridad', 'universidad'];

(async () => {
  const inicio = typeof args.fecha === 'string' ? args.fecha : hoyPeru();
  const dias = args.semana ? 7 : 1;
  // Ids ya publicados (de cualquier tipo); en la vista previa también se recuerdan los de la misma semana
  const historial = fs.existsSync(HISTORIAL) ? JSON.parse(fs.readFileSync(HISTORIAL, 'utf8')) : { usados: [] };
  const usados = new Set(historial.usados);
  console.log('Leyendo datos de UniNexo…');
  const [academias, cursos, convocatorias, materiales] = await Promise.all(['academias', 'courseOpportunities', 'convocatorias_estado', 'materiales'].map(coleccion));
  const datos = { academias, cursos, convocatorias, materiales };

  // Chrome: en GitHub Actions lo da el paquete «puppeteer»; en la PC, puppeteer-core + Chrome instalado
  let puppeteer, opciones = { headless: true, args: ['--allow-file-access-from-files', '--no-sandbox'] };
  try { puppeteer = require('puppeteer'); } catch {
    puppeteer = require('D:/uninexo/functions/node_modules/puppeteer-core');
    opciones.executablePath = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
  }
  const browser = await puppeteer.launch(opciones);
  const page = await browser.newPage();
  await page.setViewport({ width: 1080, height: 1350 });

  for (let k = 0; k < dias; k++) {
    const fecha = sumarDias(inicio, k);
    const tipo = TIPO_POR_DIA[diaSemana(fecha)];
    const post = await construir(tipo, fecha, datos, usados);
    const dir = path.join(SALIDA, fecha);
    fs.mkdirSync(dir, { recursive: true });
    const tmp = path.join(dir, '_tmp.html');
    const imagenes = [];
    for (const [i, plantilla] of [portada, detalle, cierre].entries()) {
      fs.writeFileSync(tmp, plantilla(post.p));
      await page.goto('file:///' + tmp.replace(/\\/g, '/'), { waitUntil: 'load' });
      const nombre = `${i + 1}.jpg`;
      await page.screenshot({ path: path.join(dir, nombre), type: 'jpeg', quality: 90 });
      imagenes.push(nombre);
    }
    fs.unlinkSync(tmp);
    const hashtags = [...HASH_BASE, ...post.tags].join(' ');
    const salida = {
      fecha, tipo, idDato: post.id, titulo: post.p.titulo, imagenes,
      textos: {
        instagram: `${post.texto}\n\n${hashtags}`,
        facebook: `${post.texto}\n\n${hashtags}`,
        threads: corto(post.texto, 480),
        telegram: post.texto,
      },
      estado: 'pendiente', // pendiente → aprobado / saltado → publicado
    };
    fs.writeFileSync(path.join(dir, 'post.json'), JSON.stringify(salida, null, 1));
    usados.add(post.id);
    console.log(`✓ ${fecha} (${tipo}): ${post.p.titulo}`);
  }
  await browser.close();
  if (args.guardar) fs.writeFileSync(HISTORIAL, JSON.stringify({ usados: [...usados] }, null, 1));
})().catch((e) => { console.error('Error:', e.message); process.exit(1); });
