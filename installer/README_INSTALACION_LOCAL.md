# GUÍA DE INSTALACIÓN Y FUNCIONAMIENTO LOCAL PWA
## DLA ACCESS ENTERPRISE
**Desarrollado para:** DLA Redes y Seguridad  

---

## 1. MÉTODOS DE INSTALACIÓN LOCAL

### Método 1: Instalación Automática mediante Script (Windows)
1. Ejecuta el archivo de instalación incluido en la raíz del proyecto:
   ```cmd
   install_local.bat
   ```
2. Una vez finalizada la instalación de dependencias y sembrado de base de datos, ejecuta el lanzador:
   ```cmd
   start_dla_enterprise_local.bat
   ```
3. La aplicación estará disponible inmediatamente en:
   - **PWA Web & Móvil**: [http://localhost:3000](http://localhost:3000)
   - **API REST Backend**: [http://localhost:8000/docs](http://localhost:8000/docs)

### Método 2: Instalación vía Docker Container
Si prefieres desplegar mediante contenedores de producción:
```bash
docker-compose up --build -d
```

---

## 2. REQUISITOS Y CREDENCIALES POR DEFECTO

- **Usuario Administrador por defecto**: `admin@dlaredes.com.co`
- **Contraseña por defecto**: `Dlaredes2026*`

---

## 3. FUNCIONAMIENTO OFFLINE Y SINCRONIZACIÓN EN LA APP MÓVIL

La aplicación PWA Enterprise incluye un motor de persistencia local en `IndexedDB` y `Service Worker`:

1. **Trabajo Sin Conexión (Modo Avión / Sin Señal)**:
   - El colaborador abre la PWA desde la pantalla de inicio de su teléfono o navegador.
   - Consulta su agenda y turnos descargados previamente.
   - Realiza la marcación de **Entrada** o **Salida**, captura su ubicación GPS e imagen biométrica.
   - La PWA guarda el registro de forma segura en la base de datos local `IndexedDB` manteniendo la **fecha y hora real del evento (`offline_timestamp`)**.
   - Aparecerá una notificación amarilla indicando: `"Modo Offline PWA - (X) marcaciones pendientes"`.

2. **Sincronización Automática al Volver a Tener Internet**:
   - Al detectar que la señal celular o red Wi-Fi se ha restablecido, el Service Worker activa el evento de sincronización de fondo.
   - Las marcaciones guardadas localmente se envían en orden cronológico hacia el backend (`/api/v1/mobile/me/start-visit` y `/api/v1/mobile/me/end-visit`).
   - El usuario recibe una confirmación verde: `"¡Sincronización completada exitosamente sin pérdida de información!"`.
