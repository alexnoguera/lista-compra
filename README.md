# 🛒 Nuestra Lista de la Compra Privada

Una aplicación web progresiva (**PWA**) ultra ligera, rápida y privada para gestionar la lista de la compra compartida en tiempo real entre tú y tu mujer, alojada **100% en GitHub** y sin servidores ni bases de datos de terceros.

---

## 🌟 Características Principales

- **Privacidad Total (Cifrado AES-256 E2EE):** Puedes configurar un **PIN familiar**. Los productos se cifran en tu propio navegador antes de enviarse a GitHub. Ni GitHub ni nadie que acceda a tu repositorio podrá leer qué productos tienes en la lista.
- **Sincronización en Tiempo Real:** Ambos podéis añadir o tachar productos mientras hacéis la compra en el supermercado y se sincroniza automáticamente.
- **Detección Automática de Pasillo / Categoría:** Al escribir *"Leche"* se clasifica sola en *Lácteos*, *"Manzanas"* en *Frutas*, etc.
- **Sugerencias Rápidas:** Añade productos habituales (huevos, pan, aceite, café...) con un solo toque.
- **Compartir sin complicaciones:**
  - 📷 **Código QR integrado en pantalla:** Tu mujer solo tiene que apuntar con la cámara de su móvil y la app se le configurará sola.
  - 💬 **Enlace Mágico por WhatsApp:** Envíale un enlace con la clave cifrada en el fragmento interno (`#`), sin que viaje por la red ni se guarde en servidores.
- **Funciona sin conexión (Offline / PWA):** Funciona incluso en plantas subterráneas de supermercados sin cobertura gracias al Service Worker y almacenamiento local.

---

## 🚀 Paso a Paso: Cómo ponerlo en marcha en GitHub

### Paso 1: Crear el repositorio en tu cuenta de GitHub
1. Entra en tu cuenta de [GitHub.com](https://github.com/new).
2. Crea un nuevo repositorio llamado: `lista-compra`.
   > **Nota sobre visibilidad:**
   > - Si tienes cuenta gratuita de GitHub y quieres usar **GitHub Pages**, selecciona **Público** (gracias al cifrado con PIN AES-256 que incluye la app, ¡tus datos siguen estando 100% protegidos y cifrados!).
   > - Si tienes GitHub Pro o prefieres alojar la web en Cloudflare Pages / Vercel (gratis), puedes crearlo como **Privado**.

### Paso 2: Subir el código al repositorio
Abre una terminal de PowerShell en la carpeta del proyecto (`C:\Users\serro\.gemini\antigravity\scratch\lista-compra`) o ejecuta el script `setup-github.bat` que hemos incluido.

Los comandos manuales son:
```bash
git init
git add .
git commit -m "Initial commit: Lista de la compra privada"
git branch -M main
git remote add origin https://github.com/alexnoguera/lista-compra.git
git push -u origin main
```

### Paso 3: Activar GitHub Pages (Alojamiento Web Gratis)
1. En tu repositorio en GitHub, ve a **Settings** > **Pages** (en el menú lateral izquierdo).
2. En **Build and deployment** > **Source**, elige: **Deploy from a branch**.
3. Selecciona la rama **main** y la carpeta **/(root)**.
4. Haz clic en **Save**.
5. En 1-2 minutos, GitHub te dará tu enlace web:
   `https://alexnoguera.github.io/lista-compra/`

---

## 🔑 Paso 4: Generar tu Personal Access Token (PAT)

Para que la web pueda guardar y leer los datos de tu repositorio:

1. Ve a tu GitHub: [github.com/settings/tokens](https://github.com/settings/tokens).
2. Puedes usar un **Fine-grained Token** (más seguro) o un **Token Clásico**:
   - **Opción A (Recomendada - Fine-grained):**
     - Haz clic en *Generate new token*.
     - Dale un nombre: `Lista Compra App`.
     - En *Repository access*, selecciona *Only select repositories* y elige `lista-compra`.
     - En *Permissions* > *Repository permissions*, busca **Contents** y márcalo como **Read and write**.
     - Pulsa *Generate token* y copia el token (empieza por `github_pat_...`).
   - **Opción B (Clásico):**
     - Marca la casilla `repo` (Full control of private repositories).
3. Entra en tu web `https://alexnoguera.github.io/lista-compra/`, pulsa el botón del engranaje ⚙️ y pega tu usuario, nombre del repo (`lista-compra`), el Token y tu **PIN familiar**.

---

## 💑 Paso 5: Cómo compartirla con tu mujer

¡No hace falta que ella cree cuenta de GitHub ni pegue tokens!

1. En tu móvil o PC, abre la app y pulsa el icono de Ajustes ⚙️ > pestaña **Compartir**.
2. **Opción 1 (Más rápida):** Muéstrale el código QR y dile que lo enfoque con la cámara de su móvil. Al abrir el enlace, su móvil quedará automáticamente configurado y sincronizado.
3. **Opción 2:** Pulsa **"Enviar enlace por WhatsApp"** para mandárselo en un mensaje.
4. **Instalar como App:** Tanto en iPhone (Safari > *Compartir* > *Añadir a pantalla de inicio*) como en Android (Chrome > *Menú tres puntos* > *Instalar aplicación*), se instalará con icono propio de carrito 🛒 a pantalla completa como una app nativa.

---

## 🔒 Privacidad y Seguridad

- **Cifrado de Extremo a Extremo (E2EE):** Se utiliza la API estándar `Web Crypto API` (`AES-GCM` de 256 bits y derivación `PBKDF2` con 100.000 iteraciones).
- **Protección de Enlaces:** Las credenciales que se comparten viajan en el hash de la URL (`#setup=...`), lo que garantiza que nunca se envían a ningún servidor HTTP.
- **Sin rastreo:** Cero analíticas, cero cookies de terceros, cero servicios externos.
