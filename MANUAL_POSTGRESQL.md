# Manual de Configuración y Gestión de PostgreSQL 16
## DLA Access Enterprise (v2.0)

Este manual detalla cómo configurar, conectar, optimizar y respaldar la base de datos **PostgreSQL 16** para el sistema **DLA Access Enterprise**, tanto en entornos de producción dockerizados como en servidores PostgreSQL nativos o servicios Cloud (AWS RDS, Azure Database for PostgreSQL, DigitalOcean Managed DB, Supabase).

---

## 🗄️ 1. Resumen de Conexión de la Base de Datos

El sistema utiliza **SQLAlchemy Async** con el driver `asyncpg` para comunicarse de forma asíncrona y de alto rendimiento con PostgreSQL.

* **Motor / Dialecto:** `postgresql+asyncpg`
* **Base de Datos por Defecto:** `dla_access_enterprise`
* **Usuario por Defecto:** `dla`
* **Puerto:** `5432`
* **Formato de Cadena de Conexión (`DATABASE_URL`):**
  ```env
  DATABASE_URL=postgresql+asyncpg://USUARIO:PASSWORD@HOST:5432/NOMBRE_DB
  ```

---

## 🐳 2. Opción A: PostgreSQL en Docker (Incluido y Automático)

Si despliega mediante `install_linux.sh` o `docker compose up -d`, la base de datos PostgreSQL 16 ya viene incluida y configurada en el archivo `docker-compose.yml`.

### Características:
- **Contenedor:** `dla_postgres`
- **Volumen Persistente:** `postgres_data` (los datos no se pierden al reiniciar los contenedores).
- **Healthcheck:** Verificación de salud integrada (`pg_isready`).

### Comandos de gestión directa en Docker:
```bash
# Entrar a la consola psql interactiva dentro del contenedor
docker compose exec postgres psql -U dla -d dla_access_enterprise

# Ver estado y conexiones activas
docker compose exec postgres psql -U dla -d dla_access_enterprise -c "SELECT count(*) FROM pg_stat_activity;"
```

---

## 🖥️ 3. Opción B: Servidor PostgreSQL Nativo o Externa (Cloud / RDS / Linux)

Si prefiere utilizar una instancia independiente de PostgreSQL o un servicio gestionado en la nube:

### Paso 1: Instalar PostgreSQL 16 en Linux (Ubuntu/Debian)
```bash
sudo apt-get update
sudo apt-get install -y postgresql postgresql-contrib
sudo systemctl enable --now postgresql
```

### Paso 2: Crear el Usuario y la Base de Datos
Acceda a la consola de administración de PostgreSQL:
```bash
sudo -u postgres psql
```

Ejecute los siguientes comandos SQL:
```sql
-- 1. Crear el usuario del sistema con contraseña segura
CREATE USER dla WITH PASSWORD 'MiPasswordSeguro2026*';

-- 2. Crear la base de datos asignando propietario
CREATE DATABASE dla_access_enterprise OWNER dla;

-- 3. Otorgar todos los privilegios sobre la base de datos
GRANT ALL PRIVILEGES ON DATABASE dla_access_enterprise TO dla;

-- 4. Conectarse a la base de datos y otorgar permisos en el esquema public
\c dla_access_enterprise
GRANT ALL ON SCHEMA public TO dla;

-- Salir
\q
```

### Paso 3: Configurar Acceso Remoto (Si PostgreSQL está en otro servidor)
Editar `/etc/postgresql/16/main/postgresql.conf`:
```ini
listen_addresses = '*'
```

Editar `/etc/postgresql/16/main/pg_hba.conf` para permitir conexiones desde la IP de la aplicación:
```ini
# TYPE  DATABASE        USER            ADDRESS                 METHOD
host    dla_access_enterprise  dla       192.168.1.0/24          scram-sha-256
```

Reiniciar el servicio PostgreSQL:
```bash
sudo systemctl restart postgresql
```

### Paso 4: Actualizar la variable `.env` en la Aplicación
Modifique la variable `DATABASE_URL` en el archivo `.env` del backend:
```env
DATABASE_URL=postgresql+asyncpg://dla:MiPasswordSeguro2026*@IP_DEL_SERVIDOR_POSTGRES:5432/dla_access_enterprise
```

---

## ⚙️ 4. Ejecución de Migraciones e Inicialización de Datos

Una vez configurada la cadena de conexión a PostgreSQL, ejecute los comandos de inicialización:

```bash
# En entorno Docker:
docker compose exec backend alembic upgrade head
docker compose exec backend python seed.py

# O en entorno local / nativo:
cd backend
alembic upgrade head
python seed.py
```

`seed.py` creará las tablas, asignará la estructura de módulos IAM, roles (Super Admin, Gerencia, Administración, etc.), permisos y la cuenta principal de administración (`admin@dlaredes.com.co`).

---

## 💾 5. Copias de Seguridad (Backup & Restore)

### Copia de Seguridad Completa (Dump)
```bash
# Si usa Docker:
docker compose exec -T postgres pg_dump -U dla -F c -b -v dla_access_enterprise > backup_dla_$(date +%Y%m%d_%H%M%S).dump

# Si usa PostgreSQL Nativo:
pg_dump -U dla -h localhost -F c -b -v dla_access_enterprise > backup_dla_$(date +%Y%m%d_%H%M%S).dump
```

### Restaurar Copia de Seguridad
```bash
# Si usa Docker:
docker compose exec -T postgres pg_restore -U dla -d dla_access_enterprise -c -v < backup_dla_20260914.dump

# Si usa PostgreSQL Nativo:
pg_restore -U dla -h localhost -d dla_access_enterprise -c -v backup_dla_20260914.dump
```

---

## 🚀 6. Optimización Recomendada para Producción

Para entornos con alto volumen de transacciones de marcación y geolocalización, se recomiendan los siguientes parámetros en `postgresql.conf`:

```ini
max_connections = 100
shared_buffers = 2GB              # ~25% de la RAM total del servidor
effective_cache_size = 6GB        # ~75% de la RAM total del servidor
maintenance_work_mem = 512MB
checkpoint_completion_target = 0.9
wal_buffers = 16MB
default_statistics_target = 100
random_page_cost = 1.1            # Para discos SSD
work_mem = 32MB
```

---
*Manual de PostgreSQL preparado para DLA Access Enterprise v2.0.*
