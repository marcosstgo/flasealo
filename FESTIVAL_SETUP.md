# 🎉 Configuración para Festival - Flashealo.com

## ✅ Checklist Pre-Festival

### 1. Configuración de Supabase (CRÍTICO)
- [ ] **Límites de Storage**: Verificar que el bucket `event-photos` tenga límite de tamaño configurado
- [ ] **Rate Limiting**: Configurar límites de requests por IP (recomendado: 100 requests/minuto)
- [ ] **OTP Expiry**: Reducir a 15 minutos (Dashboard → Auth → Email)
- [ ] **Password Protection**: Habilitar HaveIBeenPwned (Dashboard → Auth → Email)

### 2. Configuración del Evento
- [ ] Crear evento de prueba y verificar QR code
- [ ] Probar flujo completo de subida desde móvil
- [ ] Verificar moderación de fotos funcione correctamente
- [ ] Probar descarga masiva de fotos
- [ ] Verificar que las fotos se muestren correctamente en galería pública

### 3. Optimizaciones de Rendimiento
- [ ] Validar que las imágenes se compriman correctamente
- [ ] Verificar que HEIC se convierta a JPEG
- [ ] Probar con múltiples usuarios simultáneos
- [ ] Verificar velocidad de carga de galería con 50+ fotos

### 4. Red y Conectividad
- [ ] Verificar conexión WiFi/4G en el lugar del festival
- [ ] Tener plan B si la conexión falla (modo offline?)
- [ ] Considerar tablet/laptop como respaldo para gestión

---

## 📊 Límites Actuales Configurados

```javascript
// PhotoUploader.tsx - Límites de cliente
- Tamaño máximo por foto: 10 MB
- Formatos aceptados: JPEG, PNG, HEIC, HEIF
- Conversión automática HEIC → JPEG (calidad 80%)

// Storage Bucket
- Bucket público: event-photos
- Sin límite de tamaño total configurado ⚠️
- Sin límite de archivos configurado ⚠️
```

---

## 🚨 Configuraciones Recomendadas en Supabase Dashboard

### Storage Bucket Limits (IMPORTANTE)
1. Ve a: Storage → event-photos → Settings
2. Configura:
   - **File size limit**: 10 MB (10485760 bytes)
   - **Allowed MIME types**: `image/jpeg,image/png,image/jpg`
   - **Public**: ✅ Enabled

### Rate Limiting (CRÍTICO para eventos masivos)
Si esperas más de 50 personas subiendo fotos simultáneamente:
1. Ve a: Settings → API → Rate Limits
2. Ajusta según necesidad (default es generalmente suficiente)

---

## 📱 Instrucciones para Asistentes del Festival

### Cómo subir fotos:

1. **Escanea el código QR** del evento (imprímelo en banners/pantallas)
2. Se abrirá la página de subida automáticamente
3. **Ingresa tu nombre** (para identificar al fotógrafo)
4. **Acepta el consentimiento** de publicación
5. Toca "📸 Tomar Foto" o "🖼️ Seleccionar de Galería"
6. Espera a que se suban (verás ✓ verde cuando termine)

### Cómo ver la galería:

1. Mismo código QR o link directo
2. Tap en "Ver Galería"
3. Todas las fotos aprobadas se muestran en tiempo real

---

## 🔧 Solución de Problemas Comunes

### Las fotos no se suben
- ✅ Verificar conexión a internet
- ✅ Verificar que el tamaño sea menor a 10 MB
- ✅ Verificar formato de imagen (JPEG/PNG/HEIC)
- ✅ Refrescar página y reintentar

### Fotos no aparecen en galería
- ✅ Las fotos están en estado "pendiente" (esperando moderación)
- ✅ El organizador debe aprobarlas desde Dashboard
- ✅ Solo fotos "aprobadas" se muestran públicamente

### Galería lenta
- ✅ Usar WiFi en lugar de datos móviles
- ✅ Si hay 100+ fotos, la carga puede tomar 5-10 segundos
- ✅ Las miniaturas se cargan progressivamente

### Usuarios no pueden registrarse
- ⚠️ Solo el organizador necesita cuenta
- ⚠️ Los asistentes NO necesitan cuenta para subir fotos
- ⚠️ Solo necesitan escanear QR y poner su nombre

---

## 🎯 Recomendaciones Durante el Festival

### Para el Organizador:
1. **Modera rápido**: Revisa y aprueba fotos cada 15-30 minutos
2. **Ten ayuda**: Si esperas 100+ personas, ten alguien ayudándote a moderar
3. **Backup**: Descarga fotos periódicamente por si acaso
4. **Comunica el QR**: Proyéctalo, imprímelo, ponlo en redes sociales

### Para los Asistentes:
1. **Paciencia**: Las fotos tardan 5-30 segundos en subir según conexión
2. **WiFi mejor que 4G**: Si hay WiFi del festival, úsalo
3. **Fotos de calidad**: Toma fotos claras, bien iluminadas
4. **No subas spam**: Solo momentos importantes del festival

---

## 📈 Monitoreo Durante el Evento

### Dashboard del Organizador
Revisa constantemente:
- ✅ Número de fotos subidas
- ✅ Número de fotos pendientes de moderación
- ✅ Visitantes únicos del evento
- ✅ Gráficas de actividad por hora

### Señales de Alerta
- 🚨 Más de 50 fotos pendientes → Modera más rápido
- 🚨 Galería no carga → Posible problema de red/servidor
- 🚨 Quejas de usuarios → Revisar estado de Supabase

---

## 🆘 Contactos de Emergencia

```
Supabase Status: https://status.supabase.com/
Soporte Técnico: (Tu contacto aquí)
```

---

## ✨ Después del Festival

1. **Descarga todas las fotos** (Bulk Download)
2. **Cierra las subidas** si quieres (cambiar evento a privado)
3. **Comparte el link** de galería pública con asistentes
4. **Respaldo final**: Guarda todas las fotos en cloud storage adicional

---

## 🔒 Seguridad y Privacidad

- ✅ Las fotos requieren aprobación antes de ser públicas
- ✅ Los asistentes consienten la publicación al subir
- ✅ El organizador puede eliminar cualquier foto
- ✅ Nombres de fotógrafos son públicos (se muestran en galería)
- ⚠️ Una vez publicadas, las fotos son visibles para todos con el link

---

**¡Disfruta tu festival! 🎊**
