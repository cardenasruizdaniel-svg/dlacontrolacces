# MANUAL DE PRODUCCIÓN Y DESPLIEGUE - DLA ACCESS ENTERPRISE

**Desarrollado por:** DLA Redes y Seguridad  
**Versión:** 1.0.0 Enterprise  

---

## 1. INFRAESTRUCTURA Y ARQUITECTURA DE PRODUCCIÓN

En un entorno de producción, **DLA Access Enterprise** se despliega utilizando contenedores **Docker** orquestados con **Docker Compose** y protegidos por un Reverse Proxy **Nginx** con certificados SSL/TLS (HTTPS).

```
                      +-------------------+
                      |   Client Browsers |
                      |    & Mobile Apps  |
                      +---------+---------+
                                | HTTPS (443)
                                v
                      +-------------------+
                      |   Nginx Reverse   |
                      |       Proxy       |
                      +----+---------+----+
                           |         |
                  +--------+         +--------+
                  |                           |
                  v                           v
        +-------------------+       +-------------------+
        |  Frontend Next.js |       |  FastAPI Backend  |
        |   Port 3000       |       |    Port 8000      |
        +-------------------+       +----+---------+----+
                                         |         |
                                         v         v
                                  +----------+ +-------+
                                  |PostgreSQL| | Redis |
                                  |Port 5432 | |  6379 |
                                  +----------+ +-------+
```

---

## 2. LISTA DE VERIFICACIÓN PARA SALIDA A PRODUCCIÓN

Antes de realizar el despliegue final, asegúrese de haber configurado:

- [x] Generar una clave secreta segura de 64 caracteres en `SECRET_KEY`.
- [x] Establecer `ENVIRONMENT=production`.
- [x] Configurar credenciales fuertes de PostgreSQL y Redis.
- [x] Verificar que los dominios autorizados estén configurados en `CORS_ORIGINS`.
- [x] Certificados SSL activados (Let's Encrypt / Certbot).
- [x] Backup automático diario de PostgreSQL habilitado.

---

## 3. PASOS DE DESPLIEGUE CON DOCKER COMPOSE

### Paso 1: Clonar el Repositorio y Configurar Entorno
```bash
git clone https://github.com/dlaredes/dla-access-enterprise.git
cd dla-access-enterprise
cp .env.example .env
# Modifique .env con las variables de producción
```

### Paso 2: Ejecutar Construcción y Despliegue
```bash
docker compose -f docker-compose.yml up -d --build
```

### Paso 3: Aplicar Migraciones de Base de Datos y Semilla Inicial
```bash
docker compose exec backend alembic upgrade head
docker compose exec backend python seed.py
```

### Paso 4: Verificar Estado de los Servicios
```bash
docker compose ps
```

---

## 4. MANTENIMIENTO Y AUDITORÍA DE LOGS

### Visualizar Logs en Tiempo Real
```bash
# Backend Logs
docker compose logs -f backend

# Nginx Logs
docker compose logs -f nginx
```

### Copias de Seguridad de Base de Datos (Backups)
```bash
# Crear Backup Dump
docker compose exec postgres pg_dump -U dla dla_access_enterprise > backup_$(date +%Y%m%d_%H%M%S).sql

# Restaurar Backup Dump
cat backup_file.sql | docker compose exec -T postgres psql -U dla dla_access_enterprise
```
