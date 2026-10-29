# Riesgos jurídicos a revisar antes del lanzamiento comercial

> Documento de trabajo técnico, no es asesoramiento jurídico. Requiere revisión por profesionales.

1. **Propiedad industrial / intelectual** — El dispositivo "TL-1 EDU" es un diseño propio. Revisar que la forma
   (formato DIN), disposición de botones, pictogramas y textos no se consideren confusión con productos registrados.
   Los pictogramas de actividad siguen el concepto normativo general pero están dibujados desde cero.
2. **Marcas** — No usar nombres de fabricantes ni del sistema oficial en marketing. Verificar disponibilidad de la
   marca "TachoLab" (OEPM/EUIPO) antes de invertir en ella.
3. **Apariencia de homologación** — Avisos visibles: inicio (modal), pie de página, carcasa ("NO HOMOLOGADO"),
   pantalla de información del equipo. El certificado premium deberá indicar expresamente que no es oficial.
4. **Exactitud normativa / responsabilidad** — Cálculos preliminares, no verificados. Riesgo de que un usuario confíe en
   ellos para su trabajo real. Necesario: limitación de responsabilidad en condiciones de uso, revisión experta del
   motor normativo y fecha de la versión normativa aplicada.
5. **Formación profesional reglada (CAP)** — No presentar el producto como formación acreditada salvo acuerdo con un
   centro autorizado.
6. **Protección de datos (RGPD/LOPDGDD)** — Fase 1 sin cuentas (todo local). Único dato personal opcional: el nombre que el alumno pone en su tarjeta ficticia; se guarda solo en el navegador, no se envía a ningún servidor y se borra desde Ajustes. Si en la Fase 6 se sincroniza con una cuenta, deberá figurar en la política de privacidad. Con cuentas (Fase 6):
   política de privacidad, base jurídica, encargados (Supabase, Stripe), transferencias internacionales, derecho de
   supresión (ya existe borrado local) y analítica sin cookies o con consentimiento.
7. **Consumidores y comercio electrónico** — Condiciones de venta, derecho de desistimiento en contenido digital,
   información precontractual, IVA OSS para ventas UE.
8. **Pagos** — Stripe gestionará los datos de tarjeta; la app no los almacenará. Pagos desactivados (`PRICING.active = false`).
9. **Licencias B2B** (autoescuelas) — contrato de licencia y tratamiento de datos de alumnos (rol de encargado).
