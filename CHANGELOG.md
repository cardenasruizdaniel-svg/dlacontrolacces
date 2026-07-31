# CHANGELOG - DLA Access Enterprise

## [2.0.0] - 2026-07-25

### Refactorizacion: Unificacion de Empleados y Usuarios

#### FASE 2A - Migracion de Base de Datos
- Migrada tabla `notifications`: eliminada columna `user_id`, conservada `employee_id` como FK unico
- Migrada tabla `push_tokens`: eliminada columna `user_id`, agregada `employee_id` como FK a `employees`
- Corregidos nombres de constraints: `fk_patients_*` -> `fk_personas_*`, `pk_patients` -> `pk_personas`
- Corregido indice: `ix_shifts_patient_id` -> `ix_shifts_persona_id`
- Tabla `users` eliminada completamente (duplicaba campos auth de `employees`)

#### FASE 2B - Limpieza Backend
- Eliminado modelo `User` de `models_auth.py`
- Eliminada relacion `Role.users` (reemplazada por `Role.employees`)
- Eliminados metodos `sync_user_record()` y `sync_user_from_employee()` del EmployeeRepository
- Eliminadas llamadas a sync en `EmployeeService` (create_access, update_access, reset_password)
- Employee es ahora la unica entidad de autenticacion

#### FASE 2C - Limpieza Frontend Web
- Eliminadas 9 dependencias npm sin usar: `@tanstack/react-table`, `recharts`, `leaflet`, `react-leaflet`, `react-hook-form`, `@hookform/resolvers`, `zod`, `react-hot-toast`, `date-fns`
- Eliminadas 7 interfaces TypeScript muertas del types/index.ts
- Eliminadas 3 funciones utilitarias muertas (formatDate, formatDateTime, getInitials)
- Header dropdown: "Mi Perfil" ahora navega a `/employees/[id]`, "Configuracion" a `/settings`

#### FASE 3A - Correccion Mobile: API URL
- API URL ahora es dinamica: web usa `window.location.hostname:8888`, native usa IP LAN configurable
- Eliminada dependencia de `127.0.0.1` que fallaba en dispositivos reales

#### FASE 3B - Correccion Mobile: Bugs Criticos
- Skeleton: color de fondo ahora usa tema en vez de hardcoded `#374151`
- EnrollmentScreen: guard para web en boton de permisos de camara (evita crash)
- AccessScreen: battery_level ahora lee nivel real via `expo-battery` (fallback a 100)

#### FASE 3C - Correccion Mobile: Persistencia y UX
- SettingsScreen: toggles autoLock y notifications ahora persisten en SecureStore
- NotificationsScreen: colores de icono corregidos con mapa de tipos (shift, payroll, system, alert)

#### FASE 4 - Validacion de Plataforma
- Login valida `platform_access` contra el parametro `platform` del query string
- Usuario solo WEB: bloqueado desde app movil
- Usuario solo APP: bloqueado desde ERP web
- Usuario ambas plataformas: acceso desde ambos

---

## [1.0.0] - 2026-07-20

### Version Inicial
- Backend FastAPI con 15+ modulos
- Frontend Next.js 14 con 16 paginas funcionales
- App movil React Native Expo con soporte offline
- Sistema de autenticacion JWT con MFA
- Gestion de empleados, clientes, contratos, nomina
- Programacion de turnos con calendario
- Geolocalizacion y geocerca
- Control de acceso con reconocimiento facial
- Reportes y asistente IA
