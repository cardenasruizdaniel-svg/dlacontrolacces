#!/usr/bin/env bash
# ==============================================================================
# Script de Instalación Automática - DLA Access Enterprise para Linux
# Compatible con Ubuntu / Debian / RHEL / AlmaLinux / CentOS
# ==============================================================================

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}======================================================================${NC}"
echo -e "${GREEN}   DLA ACCESS ENTERPRISE - SCRIPT DE INSTALACIÓN LINUX   ${NC}"
echo -e "${BLUE}======================================================================${NC}"
echo ""

# 1. Verificar permisos de ejecucion y herramientas base
echo -e "${YELLOW}[1/6] Verificando dependencias del sistema...${NC}"

if ! command -v git &> /dev/null; then
    echo -e "${YELLOW}Git no encontrado. Instalando Git...${NC}"
    if command -v apt-get &> /dev/null; then
        sudo apt-get update && sudo apt-get install -y git curl
    elif command -v dnf &> /dev/null; then
        sudo dnf install -y git curl
    elif command -v yum &> /dev/null; then
        sudo yum install -y git curl
    fi
fi

# Verificar Docker
if ! command -v docker &> /dev/null; then
    echo -e "${YELLOW}Docker no encontrado. Instalando Docker Engine...${NC}"
    curl -fsSL https://get.docker.com | sh
    sudo systemctl enable --now docker
    sudo usermod -aG docker $USER || true
    echo -e "${GREEN}Docker instalado exitosamente.${NC}"
else
    echo -e "${GREEN}✓ Docker está instalado.${NC}"
fi

# Verificar Docker Compose
if docker compose version &> /dev/null; then
    DOCKER_COMPOSE_CMD="docker compose"
elif command -v docker-compose &> /dev/null; then
    DOCKER_COMPOSE_CMD="docker-compose"
else
    echo -e "${YELLOW}Instalando plugin Docker Compose...${NC}"
    if command -v apt-get &> /dev/null; then
        sudo apt-get update && sudo apt-get install -y docker-compose-plugin
    else
        echo -e "${RED}Por favor instale docker-compose manualmente y vuelva a ejecutar este script.${NC}"
        exit 1
    fi
    DOCKER_COMPOSE_CMD="docker compose"
fi

echo -e "${GREEN}✓ Comando Compose detectado: $DOCKER_COMPOSE_CMD${NC}"

# 2. Configurar variables de entorno (.env)
echo -e "${YELLOW}[2/6] Configurando archivo de entorno .env...${NC}"

if [ ! -f .env ]; then
    SECRET_KEY_GEN=$(python3 -c "import secrets; print(secrets.token_hex(32))" 2>/dev/null || openssl rand -hex 32 2>/dev/null || echo "dla_sec_$(date +%s)")
    cat <<EOF > .env
# Configuración de Producción DLA Access Enterprise
ENVIRONMENT=production
DEBUG=false
SECRET_KEY=${SECRET_KEY_GEN}

# Base de datos PostgreSQL
POSTGRES_DB=dla_access_enterprise
POSTGRES_USER=dla
POSTGRES_PASSWORD=dla_password_$(date +%s | tail -c 5)
DATABASE_URL=postgresql+asyncpg://dla:\${POSTGRES_PASSWORD}@postgres:5432/dla_access_enterprise

# Redis & RabbitMQ
REDIS_URL=redis://redis:6379/0
RABBITMQ_URL=amqp://guest:guest@rabbitmq:5672/

# Frontend & Host
NEXT_PUBLIC_API_URL=/api/v1
EOF
    echo -e "${GREEN}✓ Archivo .env generado automáticamente con secretos seguros.${NC}"
else
    echo -e "${GREEN}✓ Archivo .env existente detectado.${NC}"
fi

# 3. Construir e iniciar contenedores
echo -e "${YELLOW}[3/6] Compilando e iniciando los contenedores Docker...${NC}"
$DOCKER_COMPOSE_CMD down --remove-orphans || true
$DOCKER_COMPOSE_CMD build --parallel
$DOCKER_COMPOSE_CMD up -d

echo -e "${GREEN}✓ Contenedores iniciados. Esperando inicialización de servicios (15s)...${NC}"
sleep 15

# 4. Ejecutar Migraciones de Base de Datos
echo -e "${YELLOW}[4/6] Aplicando migraciones de base de datos Alembic...${NC}"
$DOCKER_COMPOSE_CMD exec -T backend alembic upgrade head
echo -e "${GREEN}✓ Migraciones de base de datos aplicadas.${NC}"

# 5. Ejecutar Seed de Datos Iniciales (Roles, Permisos, Usuario Admin)
echo -e "${YELLOW}[5/6] Sembrando datos iniciales y usuario Super Admin...${NC}"
$DOCKER_COMPOSE_CMD exec -T backend python seed.py
echo -e "${GREEN}✓ Sembrado de datos iniciales completado.${NC}"

# 6. Verificación de estado de la aplicación
echo -e "${YELLOW}[6/6] Verificando salud del sistema...${NC}"
$DOCKER_COMPOSE_CMD ps

echo ""
echo -e "${BLUE}======================================================================${NC}"
echo -e "${GREEN}   ¡INSTALACIÓN COMPLETADA EXITOSAMENTE!   ${NC}"
echo -e "${BLUE}======================================================================${NC}"
echo -e "${GREEN}Acceso a la Plataforma Web y PWA:${NC}"
echo -e "   URL Principal:  http://localhost  (o la IP/dominio del servidor)"
echo -e "   Documentación: http://localhost/docs"
echo ""
echo -e "${GREEN}Credenciales de Acceso Administrador:${NC}"
echo -e "   Usuario:    ${YELLOW}admin@dlaredes.com.co${NC} (o usuario: ${YELLOW}admin${NC})"
echo -e "   Contraseña: ${YELLOW}Dlaredes2026*${NC}"
echo ""
echo -e "${GREEN}Comandos útiles para gestión:${NC}"
echo -e "   Ver logs:       $DOCKER_COMPOSE_CMD logs -f"
echo -e "   Reiniciar:      $DOCKER_COMPOSE_CMD restart"
echo -e "   Detener:        $DOCKER_COMPOSE_CMD down"
echo -e "${BLUE}======================================================================${NC}"
