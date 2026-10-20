# UniNexo Perú · publicaciones diarias

Genera cada día un carrusel con **datos reales** de [uninexo.link](https://uninexo.link) y lo publica en las redes de UniNexo Perú **solo si el dueño lo aprueba** desde Telegram.

## Cómo funciona
1. **08:00 (Perú):** `generar.cjs` arma el post del día (3 imágenes + textos) y `pedir-aprobacion.cjs` lo manda al Telegram del dueño con **✅ Publicar / ❌ Saltar**.
2. **19:00 (Perú):** `publicar.cjs` revisa la respuesta. Si fue «Publicar», lo publica; si no, no publica nada.

| Día | Tipo de post |
|---|---|
| Lunes | 🏫 Academia del día |
| Martes | 💼 Prácticas o empleo del Estado (si no hay abiertas: un curso o beca) |
| Miércoles | 👥 Comunidad por carrera |
| Jueves | 📚 Curso o beca gratis |
| Viernes | 🛡️ Consejo de seguridad |
| Sábado | 🎓 Universidad del día |
| Domingo | 📝 Examen de admisión o material |

## Secretos (Settings → Secrets and variables → Actions)
| Secreto | Qué es |
|---|---|
| `TELEGRAM_BOT_TOKEN` | Token del bot (de @BotFather) |
| `TELEGRAM_ADMIN_CHAT_ID` | Tu id de Telegram (solo tus respuestas cuentan) |
| `TELEGRAM_CANAL` | Canal donde se publica, p. ej. `@uninexoperu` |

Nunca escribas un token en el código ni en un commit.

## En la PC
- Vista previa de 7 días: `node generar.cjs --semana` (no guarda historial).
- Actualizar los grupos curados desde el proyecto: en `D:\uninexo`, `npx tsx ../uninexo-redes/scripts/exportar-datos.ts`.
