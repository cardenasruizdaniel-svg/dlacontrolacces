#!/usr/bin/env bash
# ==============================================================================
# Script de Inicio - DLA Access Enterprise (Linux)
# Igual que DEAVisitas / DEATurno
# ==============================================================================

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}======================================================================${NC}"
echo -e "${GREEN}   INICIANDO DLA ACCESS ENTERPRISE (SERVIDOR LINUX)   ${NC}"
echo -e "${BLUE}======================================================================${NC}"

# Detectar comando Docker Compose
if docker compose version &> /dev/null; then
    DOCKER_COMPOSE_CMD="docker compose"
elif command -v docker-compose &> /dev/null; then
    DOCKER_COMPOSE_CMD="docker-compose"
else
    echo -e "${RED}Error: Docker Compose no se encuentra instalado.${NC}"
    exit 1
fi

echo -e "${YELLOW}Levantando servicios en segundo plano...${NC}"
$DOCKER_COMPOSE_CMD up -d

echo -e "${GREEN}✓ Servicios iniciados correctamente.${NC}"
echo ""
$DOCKER_COMPOSE_CMD ps
echo ""
echo -e "${GREEN}Plataforma Web / PWA:${NC} http://localhost"
echo -e "${GREEN}Documentación API:  ${NC} http://localhost/docs"
echo -e "${BLUE}======================================================================${NC}"
