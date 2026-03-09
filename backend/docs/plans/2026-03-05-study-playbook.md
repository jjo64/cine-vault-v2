# Study Playbook — Ejecución Operativa (CineVault)

## Objetivo
Estandarizar cómo estudiar y cómo producir evidencia técnica cada semana para completar el plan 0–29 con calidad Senior/Tech Lead.

## Ritual diario (60–120 min)
1. 5 min: definir objetivo del día (1 capítulo o 1 laboratorio).
2. 35–60 min: lectura activa con notas (trade-offs, riesgos, decisiones).
3. 30–50 min: laboratorio aplicado al repo (diagrama, matriz, benchmark, checklist, etc.).
4. 10 min: registrar evidencia en el tracker semanal.

## Evidencias válidas
- Documento técnico en `backend/docs/plans/*`.
- Diagrama o matriz versionada.
- Resultado de benchmark con baseline y delta.
- Resultado de validación de contrato (`swagger-cli validate`).
- Hallazgo de riesgo + mitigación explícita.

## Comandos base
```bash
cd backend
npm run dev
npx swagger-cli validate docs/openapi.yaml
npm run lint
npm run test
```

## Criterio de calidad semanal
- Score final >= 85.
- 0 bloqueadores críticos sin plan.
- Al menos 1 trade-off y 1 deuda técnica detectada.
- Entregable principal de la semana terminado y evidenciado.

## Plantilla de cierre semanal (copiar/pegar)
```md
### Cierre semanal
- Estado: aprobada | refuerzo
- Score teórico:
- Score práctico:
- Score operacional:
- Score final:
- Trade-off principal:
- Deuda técnica principal:
- Acción correctiva siguiente semana:
```

## Regla de escalamiento
Si una semana queda en `refuerzo` por 2 ciclos consecutivos:
1. Reducir alcance al entregable mínimo viable.
2. Bloquear nuevas semanas hasta cerrar la deuda crítica.
3. Ejecutar mini-retro de 15 min (qué falló, qué se cambia).
