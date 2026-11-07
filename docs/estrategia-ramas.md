# Estrategia de ramas y despliegue

**Definida:** 2026-11-02
**Remoto:** `origin` → `https://github.com/ecapdevilla/mooc-docente.git`
**Sitio publicado:** `https://mooc-docente.vercel.app`

## 1. Modelo elegido: tronco con ramas cortas

| Rama | Papel | Reglas |
| --- | --- | --- |
| `main` | Producción. Vercel despliega Production desde aquí | PR obligatorio, checks en verde, sin force-push, sin borrar |
| `feat/<tema>` | Funcionalidad nueva | Sale de `main`, vive lo que dure la tarea, se integra por squash |
| `fix/<tema>` | Corrección de un defecto | Igual que `feat` |
| `docs/<tema>` | Solo documentación | Igual que `feat` |
| `chore/<tema>` | Tooling, dependencias, configuración | Igual que `feat` |
| `hotfix/<tema>` | Urgencia en producción | Sale de `main`, vuelve a `main` y se etiqueta |
| `recovery/<fecha>` | Histórico de recuperaciones | No recibe commits nuevos; se conserva como evidencia |

No se usa `develop`. Es un producto con un responsable técnico y agentes de
apoyo: una rama de integración añadiría dos despliegues por cambio (uno de
integración y otro de producción) sin comprar nada a cambio. La integración se
verifica en el Preview Deployment de la propia rama corta.

`recovery/integracion-20261031` es la historia desde la que se reconstruyó el
repositorio tras el incidente de integración: se conserva como archivo, no como
rama de trabajo activa.

## 2. Convención de commits

- Conventional Commits en español: `feat(scope)`, `fix(scope)`, `docs(scope)`,
  `test(scope)`, `chore(scope)`, `refactor(scope)`.
- `scope` = área tocada o identificador de tarea: `api`, `spa`, `db`, `deploy`,
  `T2.5`.
- Un commit = un cambio verificable. El cuerpo explica el porqué, no repite el
  diff.
- Los mensajes llevan acentos; se escriben con `git commit -F archivo` en UTF-8
  sin BOM cuando se redactan desde PowerShell, para no perder los caracteres.

## 3. Ciclo de trabajo

```bash
git switch main
git pull --ff-only
git switch -c feat/<tema>

# cambios + validación local mínima
node --check <archivos JS tocados>
node node_modules/jest/bin/jest.js --maxWorkers=2 <suite enfocada>
node node_modules/jest/bin/jest.js --maxWorkers=2      # suite completa antes de integrar

git push -u origin feat/<tema>   # Vercel crea el Preview Deployment
```

En el Preview: abrir la URL del deployment, revisar la vista tocada y comprobar
las cabeceras (`Content-Security-Policy`, `Cache-Control`) del HTML.

```bash
git switch main
git merge --squash feat/<tema>
git commit -m "feat(<scope>): <resumen>"
git push origin main             # despliegue automático a Production
git branch -d feat/<tema>
git push origin --delete feat/<tema>
```

Después de cada publicación, verificar con evidencia y no con la memoria:

```bash
curl -s https://mooc-docente.vercel.app/health        # commit == SHA publicado
curl -sI https://mooc-docente.vercel.app/ | Select-String 'content-security-policy|last-modified'
curl -s -o NUL -w '%{http_code} %{content_type}\n' https://mooc-docente.vercel.app/js/vistas/<vista>.js
```

## 4. Versionado y etiquetas

- Formato `v0.<etapa>.<parche>`: `v0.2.0` cierra la Etapa 2 del frontend
  (T2.1 a T2.5). Un parche sube solo con correcciones verificadas.
- El tag se crea **después** de comprobar el despliegue, y apunta al commit que
  `/health` reporta como publicado.
- `GET /health` y `GET /api/v1` devuelven `commit` (7 caracteres del SHA): es la
  evidencia de qué versión está en línea, sin abrir el panel de Vercel.

```bash
git tag -a v0.2.0 -m "Etapa 2: frontend único, CSP estática y evaluación final por curso"
git push origin v0.2.0
```

## 5. Reversión

- **Código:** `git revert <sha>` sobre `main` y push. No se reescribe `main`.
- **Despliegue:** en Vercel, *Deployments → deployment anterior → Promote to
  Production*. Anotar el SHA revertido en `docs/handoff.md`.
- **Base de datos:** las migraciones son aditivas e idempotentes. Antes de
  aplicar una en Supabase, seguir `docs/carga-catalogo-production.md`
  (respaldo, verificación de cascada y marcha atrás).

## 6. Estado de la migración a este modelo (2026-11-06)

### Hallazgo de despliegue (verificado por API)

El proyecto `mooc-docente` de Vercel es **`sourceless`**: se despliega
manualmente (`vercel --prod` desde un checkout local), **no** por auto-deploy de
Git. La CLI adjunta el SHA del commit local al subir, por eso `/health` lo
reporta. El campo `productionBranch` del `link` sigue apuntando a
`recovery/integracion-20261031`, pero en un proyecto sourceless **no gobierna
ningún despliegue**: es cosmético mientras no se reconecte Git.

### Pasos de panel

1. ~~GitHub → *Settings → Branches* → cambiar la rama por defecto a `main`.~~
   **Hecho**: verificado por API (`default_branch = main`).
2. ~~GitHub → *Settings → Branches* → regla de protección para `main`.~~
   **Hecho el 2026-11-06, protección mínima**: `allow_force_pushes = false` y
   `allow_deletions = false`. La variante completa (PR obligatorio + checks
   requeridos) queda pendiente de un CI que hoy no existe (no hay
   `.github/workflows`).
3. Vercel → *Settings → Git → Production Branch* = `main`. **Pendiente, en el
   panel web**: la API v9 rechaza `productionBranch`/`link` en el PATCH de
   proyectos y la CLI solo expone `vercel git connect|disconnect`. Es cosmético
   mientras el proyecto sea sourceless; lo que importa es desplegar `main`.

### Cómo se publica hoy

`vercel --prod` desde un checkout en `main`. No hay auto-deploy: un push a
`main` **no** publica hasta que se ejecute `vercel --prod`. Para publicar el
HEAD vigente de `main` basta desplegar desde ese checkout.

- Los agentes no crean commits ni ramas sin pedido explícito; cuando lo hacen,
  registran el SHA y la evidencia de despliegue en `docs/handoff.md`.
