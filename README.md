# DLA Access Enterprise (v2.0)

Plataforma empresarial de control de acceso, gestión de personal, turnos domiciliarios, nómina, geolocalización y operaciones en campo (PWA/Mobile).

---

## 🚀 Instalación Rápida en Linux (Ubuntu / Debian / RHEL / CentOS)

### Instalación Automática en 1 Comando (Recomendada)
```bash
git clone https://github.com/cardenasruizdaniel-svg/dlacontrolacces.git dla-access-enterprise
cd dla-access-enterprise
chmod +x install_linux.sh
./install_linux.sh
```

### Control y Operación del Sistema en Linux
* **Iniciar:** `./start_linux.sh` (o `sudo systemctl start dla-access`)
* **Detener:** `./stop_linux.sh` (o `sudo systemctl stop dla-access`)
* **Estado:** `./status_linux.sh` (o `sudo systemctl status dla-access`)

Consulte los manuales completos de despliegue y base de datos:
📄 **[MANUAL_INSTALACION_LINUX.md](MANUAL_INSTALACION_LINUX.md)**  
🗄️ **[MANUAL_POSTGRESQL.md](MANUAL_POSTGRESQL.md)**

---

## 💻 Instalación Rápida en Windows

### Entorno de Producción / Prueba Local
Ejecute el script de instalación automática para Windows:
```cmd
install_deacontrol.bat
```

Para más detalles, consulte la guía general:
📄 **[Manual_DEAControl.md](Manual_DEAControl.md)** y **[docs/manual-instalacion.md](docs/manual-instalacion.md)**

---

## 🔑 Credenciales por Defecto (Super Admin)

* **URL Web:** `http://localhost`
* **API / Swagger:** `http://localhost/docs`
* **Usuario:** `admin@dlaredes.com.co` (o `admin`)
* **Contraseña:** `Dlaredes2026*`

---

## 🏗️ Arquitectura del Sistema

* **Backend:** FastAPI (Python 3.11) + SQLAlchemy Async + Alembic + Celery
* **Frontend / PWA:** Next.js 14 + React + Tailwind CSS + Lucide Icons
* **Base de Datos:** PostgreSQL 16
* **Caché / Mensajería:** Redis 7 + RabbitMQ 3
* **Reverse Proxy:** Nginx (Puerto 80 / 443)
