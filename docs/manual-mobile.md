# MANUAL DE USUARIO Y OPERACIÓN MÓVIL - DLA ACCESS ENTERPRISE

**Desarrollado por:** DLA Redes y Seguridad  
**Plataformas:** Android e iOS (React Native + Expo)  
**Versión:** 1.0.0 Enterprise  

---

## 1. INTRODUCCIÓN Y OBJETIVO

La aplicación móvil **DLA Access Enterprise** está diseñada para el personal de atención domiciliaria y supervisores operativos en campo. Ofrece las siguientes capacidades principales:

- **Autenticación Biométrica y Control de Acceso**: Validación estricta con cámara en tiempo real (sin selección de galería) y geolocalización GPS.
- **Agenda Diaria de Turnos y Visitas**: Visualización de cronograma, cliente asignado, dirección y ruta.
- **Sesión de Turno en Tiempo Real**: Cronómetro dinámico, registro de novedades/incidentes, notas de voz, adjuntos fotográficos y firma digital del cliente.
- **Modo Offline Transparente**: Almacenamiento local seguro cuando no hay señal con cola de sincronización automática al recuperar conectividad.
- **Monitoreo Geográfico Anti-Fraude**: Detección activa de ubicaciones simuladas (Mock Location) y nivel de batería.

---

## 2. REQUISITOS DEL DISPOSITIVO

| Elemento | Android | iOS |
|---|---|---|
| **Sistema Operativo** | Android 8.0 (API 26) o superior | iOS 14.0 o superior |
| **Cámara** | Frontal/Trasera con permisos concedidos | Frontal/Trasera con permisos concedidos |
| **GPS** | Servicios de ubicación de alta precisión activados | Servicios de ubicación ("Siempre" o "Al usar la app") |
| **Almacenamiento** | Mínimo 100 MB libres | Mínimo 100 MB libres |

---

## 3. FLUJO OPERATIVO PASO A PASO

### 3.1 Inicio de Sesión
1. Abra la app **DLA Access Enterprise**.
2. Ingrese su correo corporativo y contraseña o código PIN otorgado por administración.
3. Al iniciar sesión exitosamente, se cargará su pantalla de bienvenida con la **Agenda de Hoy**.

### 3.2 Iniciar Visita / Control de Entrada
1. Seleccione la visita programada en su agenda o presione **"Registrar Entrada"**.
2. Permita el acceso a la cámara y ubicación GPS.
3. Se abrirá la cámara en tiempo real para tomar la fotografía biométrica.
4. El sistema verificará:
   - Coincidencia del rostro contra la foto enrolada (umbral parametrizado).
   - Coordenadas GPS dentro del radio de geocerca del cliente (ej. 100m).
   - Verificación anti-ubicación simulada (Mock Location).
5. Si todas las validaciones pasan, se iniciará automáticamente el cronómetro del turno. Si falla alguna validación, se notificará la causa exacta y se registrará el intento en la auditoría.

### 3.3 Durante el Turno
1. Visualice el tiempo transcurrido y tiempo restante.
2. Registre actividades o novedades mediante los botones de acción rápida.
3. Adjunte evidencias fotográficas directas de la atención.

### 3.4 Finalizar Visita / Control de Salida
1. Al concluir la atención, presione **"Finalizar Visita"**.
2. Repita la validación biométrica con cámara en tiempo real y GPS.
3. Recabe la **Firma Digital del Cliente** en pantalla.
4. Ingrese observaciones finales y presione **"Confirmar Salida"**.
5. Se guardará el registro completo del turno en el servidor (o en cola offline si no hay red).

---

## 4. SOPORTE Y CONTACTO

Para asistencia técnica, contactar al departamento de tecnología de **DLA Redes y Seguridad**:
- **Correo**: soporte@dlaredes.com.co
