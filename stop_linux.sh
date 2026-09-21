#!/usr/bin/env bash
# ==============================================================================
# Script de Detención - DLA Access Enterprise (Linux)
# ==============================================================================

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}======================================================================${NC}"
echo -e "${YELLOW}   DETENIENDO DLA ACCESS ENTERPRISE...   ${NC}"
echo -e "${BLUE}======================================================================${NC}"

if docker compose version &> /dev/null; then
    DOCKER_COMPOSE_CMD="docker compose"
elif command -v docker-compose &> /dev/null; then
    DOCKER_COMPOSE_CMD="docker-compose"
else
    echo -e "${RED}Error: Docker Compose no se encuentra instalado.${NC}"
    exit 1
fi

$DOCKER_COMPOSE_CMD down

echo -e "${GREEN}✓ Todos los servicios han sido detenidos con éxito.${NC}"
echo -e "${BLUE}======================================================================${NC}"
