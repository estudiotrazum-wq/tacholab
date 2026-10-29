# TachoLab EU

Simulador educativo **independiente y no homologado** de tacógrafo digital europeo.
No reproduce ningún dispositivo comercial y no sustituye la formación oficial ni los equipos reales.

Estado: **Fase 1 (núcleo funcional) + v0.2 (UTC y cabina de camión con LED)** — ver [`docs/PROGRESS.md`](docs/PROGRESS.md).

## Requisitos
- Node.js ≥ 20 (probado con 22)

## Uso
```bash
npm install
npm run dev          # http://localhost:5173
```

```bash
npm test             # pruebas unitarias (Vitest)
npm run typecheck    # TypeScript estricto
npm run build        # compilación de producción en dist/
npm run e2e          # prueba de interacción en navegador real (Playwright; requiere build previo)
```

## Cómo probar el prototipo a mano
1. Acepta el aviso inicial → **Entrar en la cabina** → pulsa el tacógrafo iluminado.
2. Pulsa la **ranura** para insertar la tarjeta ficticia → ✓ (bienvenida) → ✓ (país).
3. Pulsa el **botón de actividad** (trabajo → disponibilidad → descanso).
4. **Iniciar marcha**: el equipo registra conducción automáticamente.
5. En el **Laboratorio de tiempo** elige ×60, o usa +15 min / +1 h / **Siguiente ⏭** para saltar al aviso de 4 h 15 y 4 h 30.
6. Detén el vehículo, selecciona descanso y avanza 45 min: el contador de conducción continua vuelve a 0.
7. ✓ abre el **menú** (tiempos, actividades de hoy, resumen de jornada, retirada, información).
8. ⏏ retira la tarjeta; avanza unas horas y vuelve a insertarla para probar la **entrada manual**.
9. **Calendario**: 14 días con la clasificación de cada descanso, infracciones y detalle por día. **Informe**: infracciones, obligaciones, jornadas y objetivos; se puede imprimir o descargar en JSON.
10. **Escenarios**: carga la referencia 56 h + 34 h o guarda tu escenario (1 en el plan gratuito).
11. Recarga la página: el estado se conserva (localStorage).

Todas las horas del tacógrafo y del laboratorio de tiempo son **UTC**; la hora local se muestra solo como referencia.

En la **cabina**: pulsa el tacógrafo (se maneja allí mismo), el retrovisor, la consola del techo (color e intensidad de los LED), el parasol, los interruptores (faros, luz interior, emergencia, LED), el selector de marcha N/D o el claxon. Teclas 1–4: cámaras. En Ajustes hay una calidad visual «Básica» para ordenadores modestos.

Atajos (vista Tacógrafo): ↑ ↓ · Enter (✓) · Esc (✕) · A actividad · E expulsar · I insertar · M marcha · Espacio pausa/×60.

## Documentación
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — análisis, riesgos, arquitectura, entidades y estados.
- [`docs/REGULATIONS.md`](docs/REGULATIONS.md) — catálogo normativo y estado de verificación.
- [`docs/LEGAL_RISKS.md`](docs/LEGAL_RISKS.md) — riesgos que requieren revisión profesional.
- [`docs/PROGRESS.md`](docs/PROGRESS.md) — tareas, estado y siguiente paso.
