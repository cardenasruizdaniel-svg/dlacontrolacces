# Manual Operativo DEAControl

## 1. Inicio de Sesión, Credenciales y Autenticación MFA
**Guía completa para ingresar al sistema de forma segura.**
- Ingrese a la dirección web del portal (ej: http://localhost:3000/login o la URL del servidor).
- Ingrese su correo electrónico corporativo registrado (ej: admin@dlaredes.com.co) y su contraseña.
- Si tiene habilitada la Autenticación MFA (Doble Factor), introduzca el código dinámico de 6 dígitos generado por su aplicación (Google Authenticator o Microsoft Authenticator).
- Para cerrar sesión de manera segura, haga clic en el avatar de usuario en la esquina superior derecha y seleccione 'Cerrar Sesión'.
*Tip: Nunca comparta su clave de acceso. Cada usuario queda registrado en la bitácora de auditoría con su IP y marca de tiempo.*

## 2. Gestión de Empleados y Biometría Facial
**Gestión del personal y biometría.**
- Ingrese al módulo de 'Empleados' ('/employees').
- Para registrar un nuevo empleado, haga clic en 'Nuevo Empleado', llene los datos (Documento, Nombres, Cargo, Centro de Costo, y configuración de acceso web/app).
- Al guardar, el empleado podrá ingresar a la PWA. En su primer inicio de sesión, el sistema le pedirá el Escaneo Facial Base (Face ID) para registrar su biometría en el motor de Inteligencia Artificial.
- Si un rostro queda mal registrado, un administrador puede ingresar a 'Empleados', editar el perfil, e ir a la pestaña 'Seguridad' para eliminar la foto biométrica, forzando un nuevo escaneo en el próximo inicio de sesión.

## 3. Control de Acceso y App Móvil PWA
**Manejo de turnos y aplicación de campo.**
- La aplicación móvil funciona como PWA (Progressive Web App). Los empleados deben abrirla en Safari (iOS) o Chrome (Android) y seleccionar 'Agregar a la Pantalla de Inicio'.
- Para Iniciar Turno: El empleado debe presionar 'Iniciar Turno', lo cual activará la cámara para el liveness check (prueba de vida) y el reconocimiento facial IA.
- Tolerancia de Turnos: Si un empleado sobrepasa los minutos de gracia estipulados en Ajustes, el botón de Iniciar Turno desaparecerá y el sistema marcará el turno como 'Perdido'.
- Modo Offline: Si el dispositivo pierde internet, la app guardará los fichajes de entrada/salida (con GPS encriptado y foto). Al recuperar la red, se sincronizarán en segundo plano automáticamente.

## 4. Nómina, Horas Extras y Cuentas de Cobro
**Cálculos automáticos de tiempo.**
- Ingrese a 'Nómina y Liquidación' ('/payroll'). Seleccione el periodo de corte (ej: 1 al 15 del mes).
- El sistema calcula matemáticamente (Restando la Hora de Salida de la Hora de Entrada, menos los descansos programados) las horas trabajadas.
- Si un empleado trabaja más de 8 horas en un turno, el excedente se marca como 'Horas Extras'. Las jornadas nocturnas (10:00 PM a 6:00 AM) generan recargos automáticos según la ley laboral de Colombia.
- En la PWA, los empleados pueden firmar digitalmente en la pantalla de su celular. Tras firmar, pueden enviar la Cuenta de Cobro directamente por WhatsApp a RRHH mediante el botón designado.

## 5. Reportes y Auditoría de Sistema
**Exportación de datos.**
- Ingrese a 'Reportes' ('/reports').
- Filtre los registros por fechas, empleado o sucursal.
- Presione 'Exportar a Excel' o 'Generar PDF' para obtener listados formales listos para impresión.

## 6. Configuración de Base de Datos y Limpieza
**Para crear una instancia en blanco.**
- Ingrese a 'Ajustes' con un usuario Súper Administrador.
- Desplácese hasta la tarjeta roja 'Restablecimiento del Sistema'.
- Seleccione las tablas a limpiar y confirme la acción escribiendo 'BORRAR'. La cuenta del Administrador nunca será borrada.
