#!/usr/bin/env bash
# ==============================================================================
# Script de Estado y Diagnóstico - DLA Access Enterprise (Linux)
# ==============================================================================

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}======================================================================${NC}"
echo -e "${GREEN}   ESTADO DE DLA ACCESS ENTERPRISE (DOCKER / LINUX)   ${NC}"
echo -e "${BLUE}======================================================================${NC}"

if docker compose version &> /dev/null; then
    DOCKER_COMPOSE_CMD="docker compose"
elif command -v docker-compose &> /dev/null; then
    DOCKER_COMPOSE_CMD="docker-compose"
else
    echo -e "${RED}Error: Docker Compose no se encuentra instalado.${NC}"
    exit 1
fi

echo -e "${YELLOW}Contenedores activos:${NC}"
$DOCKER_COMPOSE_CMD ps

echo ""
echo -e "${YELLOW}Uso de recursos en tiempo real:${NC}"
docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}"

echo -e "${BLUE}======================================================================${NC}"
