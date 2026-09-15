# Manual de Instalación y Despliegue en Servidor Linux
## DLA Access Enterprise (v2.0)

Este manual describe el procedimiento para instalar, configurar y desplegar la plataforma **DLA Access Enterprise** en servidores Linux (Ubuntu Server, Debian, RHEL, AlmaLinux, CentOS).

---

## 📋 1. Requisitos del Servidor Linux

### Hardware Mínimo Recomendado
* **CPU:** 2 Cores (Recomendado: 4 Cores o superior).
* **RAM:** 4 GB (Recomendado: 8 GB o superior para alto tráfico).
* **Almacenamiento:** 20 GB de espacio libre en disco SSD.
* **Sistema Operativo:** Ubuntu 20.04/22.04 LTS, Debian 11/12, RHEL 8/9 o AlmaLinux.

### Puertos de Red Necesarios
* **80 (HTTP):** Para el tráfico web y PWA.
* **443 (HTTPS):** Para conexiones seguras con certificado SSL.
* **8000 (Backend API):** Exposición de la API REST / Documentación Swagger (opcional si usa Nginx).

---

## ⚡ 2. Método 1: Instalación Automática (1-Comando - Recomendado)

El proyecto incluye el script `install_linux.sh` que automatiza la verificación de dependencias, generación de secretos, compilación de contenedores, ejecución de migraciones de base de datos y carga del usuario Administrador.

### Paso 1: Clonar el Repositorio
```bash
git clone https://github.com/cardenasruizdaniel-svg/dlacontrolacces.git dla-access-enterprise
cd dla-access-enterprise
```

### Paso 2: Otorgar Permisos y Ejecutar
```bash
chmod +x install_linux.sh
./install_linux.sh
```

El script se encargará automáticamente de:
1. Instalar **Git**, **Docker Engine** y **Docker Compose** si no están presentes.
2. Crear un archivo `.env` de producción con clave secreta (`SECRET_KEY`) y contraseñas de base de datos seguras.
3. Iniciar todos los contenedores (`PostgreSQL 16`, `Redis 7`, `RabbitMQ 3`, `Backend FastAPI`, `Frontend Next.js`, `Celery Worker`, `Nginx`).
4. Aplicar las migraciones de Alembic en la base de datos PostgreSQL.
5. Crear el usuario **Super Administrador** por defecto con todos los roles y permisos.

---

## 🛠️ 3. Método 2: Instalación Paso a Paso (Manual)

Si prefiere realizar cada paso manualmente en su servidor Linux, siga las instrucciones a continuación:

### Paso 1: Instalar Docker y Docker Compose
En Ubuntu / Debian:
```bash
sudo apt-get update
sudo apt-get install -y ca-certificates curl gnupg git
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo systemctl enable --now docker
```

### Paso 2: Configurar las Variables de Entorno
Cree un archivo `.env` en la raíz del proyecto:
```bash
cp .env.example .env 2>/dev/null || true
```

Asegúrese de incluir las siguientes variables en `.env`:
```env
ENVIRONMENT=production
DEBUG=false
SECRET_KEY=mi_super_clave_secreta_para_jwt_produccion_12345

POSTGRES_DB=dla_access_enterprise
POSTGRES_USER=dla
POSTGRES_PASSWORD=mi_password_seguro_db
DATABASE_URL=postgresql+asyncpg://dla:mi_password_seguro_db@postgres:5432/dla_access_enterprise

REDIS_URL=redis://redis:6379/0
RABBITMQ_URL=amqp://guest:guest@rabbitmq:5672/

NEXT_PUBLIC_API_URL=/api/v1
```

### Paso 3: Desplegar los Servicios con Docker Compose
```bash
docker compose build --parallel
docker compose up -d
```

### Paso 4: Ejecutar Migraciones e Inicializar la Base de Datos
```bash
# Migraciones de esquema
docker compose exec backend alembic upgrade head

# Inicializar empresa, roles, permisos y usuario Super Admin
docker compose exec backend python seed.py
```

---

## 🔑 4. Credenciales por Defecto

Una vez completada la instalación, acceda desde su navegador web:
* **URL:** `http://IP-DE-TU-SERVIDOR` (o `http://localhost`)
* **Documentación API:** `http://IP-DE-TU-SERVIDOR/docs`

### Credenciales Administrador:
* **Usuario:** `admin@dlaredes.com.co` (o nombre de usuario: `admin`)
* **Contraseña:** `Dlaredes2026*`

> ⚠️ **Importante:** Se recomienda cambiar la contraseña del administrador en su primer inicio de sesión desde el módulo de Usuarios.

---

## 🔒 5. Configuración de HTTPS / SSL con Let's Encrypt (Certbot)

Para producción con dominio propio (ejemplo: `miempresa.com`), active cifrado SSL con Nginx y Certbot:

1. **Instalar Certbot:**
```bash
sudo apt-get install -y certbot python3-certbot-nginx
```

2. **Obtener Certificado SSL:**
```bash
sudo certbot --nginx -d miempresa.com -d www.miempresa.com
```

3. **Renovación Automática:**
Certbot creará un temporizador systemd automáticamente. Puede probar la renovación con:
```bash
sudo certbot renew --dry-run
```

---

## 📦 6. Mantenimiento, Copias de Seguridad y Actualizaciones

### Copia de Seguridad de la Base de Datos PostgreSQL
```bash
# Generar respaldo en formato SQL
docker compose exec -T postgres pg_dump -U dla dla_access_enterprise > backup_$(date +%Y%m%d_%H%M%S).sql
```

### Restaurar Copia de Seguridad
```bash
cat backup_archivo.sql | docker compose exec -T postgres psql -U dla -d dla_access_enterprise
```

### Ver Registros / Logs del Sistema
```bash
# Ver logs de todos los servicios
docker compose logs -f

# Ver logs únicamente del backend
docker compose logs -f backend
```

### Actualización a Nueva Versión del Código
```bash
git pull origin main
docker compose up -d --build
docker compose exec backend alembic upgrade head
```

---

## ❓ 7. Resolución de Problemas (Troubleshooting)

| Problema | Causa Posible | Solución |
|----------|---------------|----------|
| **Error `Address already in use` (Puerto 80 ocupado)** | Apache u otro servidor web está corriendo. | Detenga Apache: `sudo systemctl stop apache2 && sudo systemctl disable apache2` |
| **Error `Permission denied` al usar Docker** | El usuario no pertenece al grupo `docker`. | Ejecute `sudo usermod -aG docker $USER` y reinicie sesión. |
| **No cargan las imágenes o fotos de perfil** | Volumen de uploads no montado. | Verifique que `upload_data` está definido en `docker-compose.yml`. |
| **PWA no funciona fuera de línea** | Falta HTTPS o Service Worker no registrado. | Asegúrese de habilitar SSL (HTTPS) con Certbot para la PWA. |

---
*Manual elaborado para el sistema DLA Access Enterprise v2.0.*
