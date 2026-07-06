#!/bin/bash

# Arrancar Portal Consejos Escolares - Linux 
################################################################################
# Uso: ./arrancar.sh

set -e  # Exit on error

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Funciones auxiliares
print_step() {
    echo -e "${BLUE}[*] $1${NC}"
}

print_success() {
    echo -e "${GREEN}[✓] $1${NC}"
}

print_error() {
    echo -e "${RED}[✗] $1${NC}"
}

print_info() {
    echo -e "${YELLOW}[i] $1${NC}"
}

# Header
clear
echo ""
echo "============================================================================"
echo "  Portal Consejos Escolares - Startup $(uname -s)"
echo "============================================================================"
echo ""

# 1. Verificar Docker
print_step "Verificando Docker..."
if ! command -v docker &> /dev/null; then
    print_error "Docker no está instalado"
    echo ""
    echo "Instálalo desde: https://docs.docker.com/get-docker/"
    echo ""
    exit 1
fi
DOCKER_VERSION=$(docker --version)
print_success "Docker disponible: $DOCKER_VERSION"
echo ""

# 2. Verificar Docker Compose
print_step "Verificando Docker Compose..."
if ! command -v docker-compose &> /dev/null; then
    print_error "Docker Compose no está disponible"
    echo ""
    exit 1
fi
DC_VERSION=$(docker-compose --version)
print_success "Docker Compose disponible: $DC_VERSION"
echo ""

# 3. Verificar archivo .env.local
print_step "Verificando variables de entorno..."
if [ ! -f ".env.local" ]; then
    print_info ".env.local no existe, creando desde .env.docker..."
    if [ -f ".env.docker" ]; then
        cp .env.docker .env.local
        print_success ".env.local creado"
    else
        print_error "No se encontró .env.docker"
        exit 1
    fi
else
    print_success ".env.local ya existe"
fi
echo ""

# 4. Validar Supabase URL
print_step "Validando configuración de Supabase..."
if grep -q "NEXT_PUBLIC_SUPABASE_URL=https://" .env.local; then
    print_success "Configuración válida"
else
    print_error "NEXT_PUBLIC_SUPABASE_URL no configurado en .env.local"
    echo ""
    echo "Por favor edita .env.local y agrega:"
    echo "  NEXT_PUBLIC_SUPABASE_URL=https://[proyecto].supabase.co"
    echo "  NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ..."
    echo ""
    
    # Intentar abrir editor
    if command -v nano &> /dev/null; then
        print_info "Abriendo editor (nano)..."
        nano .env.local
    elif command -v vi &> /dev/null; then
        print_info "Abriendo editor (vi)..."
        vi .env.local
    else
        print_error "Por favor edita .env.local manualmente"
        exit 1
    fi
fi
echo ""

# 5. Build
print_step "Construyendo imagen Docker (esto puede tomar 2-3 minutos la primera vez)..."
if docker-compose build --no-cache; then
    print_success "Imagen construida exitosamente"
else
    print_error "Falló el build"
    exit 1
fi
echo ""

# 6. Up with trap to handle CTRL + C
print_step "Levantando contenedor..."
echo ""
print_info "Presiona CTRL + C para detener los contenedores"
echo ""
echo "============================================================================"
echo ""

# Trap para detener contenedores si presiona CTRL + C
trap 'echo ""; print_step "Deteniendo contenedores..."; docker-compose down; print_success "Contenedores detenidos"; exit 0' INT TERM

# Levanta contenedores en foreground (sin -d)
if docker-compose up; then
    print_success "Contenedores detenidos correctamente"
else
    print_error "Error al levantar contenedores"
    docker-compose logs
    exit 1
fi

# Final
echo "============================================================================"
echo "  ÉXITO! Portal Consejos Escolares está listo"
echo "============================================================================"
echo ""
print_success "URL: http://localhost:9901"
echo ""
echo "Comandos útiles:"
echo "  docker-compose logs -f        : Ver logs en tiempo real"
echo "  docker-compose down           : Detener contenedor"
echo "  docker-compose ps             : Ver estado"
echo ""

# Verificar estado final
if docker-compose ps | grep -q "healthy"; then
    print_success "Contenedor está healthy ✓"
else
    print_info "Verificando health en 5 segundos..."
    sleep 5
    docker-compose ps
fi

echo ""
print_info "Abriendo http://localhost:9901 en 2 segundos..."
sleep 2

# Intentar abrir navegador
if command -v xdg-open &> /dev/null; then
    # Linux
    xdg-open http://localhost:9901 &
elif command -v open &> /dev/null; then
    # macOS
    open http://localhost:9901 &
fi

echo ""
echo "============================================================================"
echo "  Contenedor ejecutándose en background"
echo "  Para ver logs: docker-compose logs -f"
echo "  Para detener: docker-compose down"
echo "============================================================================"
echo ""

exit 0
