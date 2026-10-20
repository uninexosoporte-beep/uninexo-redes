// Exporta del proyecto UniNexo los datos que viven en el código (grupos curados y universidades).
// Uso (desde D:\uninexo): npx tsx ../uninexo-redes/scripts/exportar-datos.ts
import { writeFileSync } from 'node:fs';
import { GRUPOS_CURADOS, etiquetaOrigen } from '../../uninexo/src/data/gruposCurados.ts';
import { PERU_UNIVERSITIES } from '../../uninexo/src/data/peruUniversities.ts';

const grupos = GRUPOS_CURADOS.map((g) => ({
  id: g.id, universityId: g.universityId, carrera: g.carrera, title: g.title, platform: g.platform,
  category: g.category, description: g.description, origen: g.origen, etiqueta: etiquetaOrigen(g.origen),
  tipo: g.tipo, administra: g.administra, tema: g.tema ?? '',
}));
const universidades = PERU_UNIVERSITIES.map((u) => ({ id: u.id, sigla: u.acronym, nombre: u.name, color: u.color, tipo: u.type }));
writeFileSync(new URL('../datos/curados.json', import.meta.url), JSON.stringify({ exportado: new Date().toISOString().slice(0, 10), grupos, universidades }, null, 1));
console.log(`Exportados ${grupos.length} grupos curados y ${universidades.length} universidades`);
