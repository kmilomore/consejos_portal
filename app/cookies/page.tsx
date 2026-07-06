import type { Metadata } from "next";
import { LegalPage } from "@/components/landing/legal-page";

export const metadata: Metadata = {
  title: "Política de Cookies · Portal Consejos Escolares",
  description:
    "Uso de cookies y almacenamiento local en el sitio y el Portal Consejos Escolares del SLEP Colchagua.",
};

export default function CookiesPage() {
  return (
    <LegalPage
      eyebrow="Legal · Cookies y almacenamiento local"
      title="Política de Cookies"
      lede="Qué cookies y tecnologías de almacenamiento local utiliza este sitio, para qué sirven y cómo puedes gestionarlas."
      updatedAt="2 de julio de 2026"
    >
      <h2>1. ¿Qué son las cookies y el almacenamiento local?</h2>
      <p>
        Las <strong>cookies</strong> son pequeños archivos que un sitio web guarda en tu navegador. El{" "}
        <strong>almacenamiento local</strong> (<em>localStorage</em> y <em>sessionStorage</em>) es una tecnología
        similar que permite a una aplicación web guardar información en tu dispositivo. Ambas pueden usarse para
        mantener sesiones, recordar preferencias o, en otros sitios, para seguimiento publicitario.
      </p>

      <h2>2. Nuestro enfoque</h2>
      <p>
        Este sitio <strong>no utiliza cookies de publicidad, de seguimiento ni de analítica de terceros</strong>. Solo
        se emplea almacenamiento <strong>estrictamente necesario</strong> para que el portal de gestión funcione: mantener
        tu sesión iniciada y recordar preferencias operativas. Además, la landing pública muestra un{" "}
        <strong>aviso visible de privacidad y cookies</strong> al inicio para reforzar el principio de transparencia
        antes de continuar hacia el portal o revisar el contenido institucional, conforme a las Leyes N° 19.628 y
        N° 21.719.
      </p>

      <h2>3. Almacenamiento que utiliza el sitio</h2>
      <h3>Sitio público informativo</h3>
      <p>
        La navegación por las páginas informativas no crea cookies operativas del portal. Solo se guarda en{" "}
        <code>localStorage</code> una preferencia técnica mínima para recordar que ya viste y aceptaste el aviso de
        privacidad y cookies de la landing.
      </p>
      <table>
        <thead>
          <tr>
            <th>Elemento</th>
            <th>Tipo</th>
            <th>Finalidad</th>
            <th>Duración</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <code>consejos.landing.legal-consent.v1</code>
            </td>
            <td>localStorage</td>
            <td>Recordar que la persona visitante ya vio y aceptó el aviso de privacidad y cookies de la landing.</td>
            <td>Hasta que la persona lo elimine desde su navegador</td>
          </tr>
        </tbody>
      </table>
      <h3>Portal de gestión (solo usuarios autenticados)</h3>
      <p>Al iniciar sesión en el portal se utiliza el siguiente almacenamiento en tu navegador:</p>
      <table>
        <thead>
          <tr>
            <th>Elemento</th>
            <th>Tipo</th>
            <th>Finalidad</th>
            <th>Duración</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <code>consejos-portal</code>
            </td>
            <td>localStorage</td>
            <td>Mantener la sesión autenticada (token de sesión de la plataforma de autenticación).</td>
            <td>Hasta cerrar sesión o expirar el token</td>
          </tr>
          <tr>
            <td>
              <code>consejos.portal.selected-rbd</code>
            </td>
            <td>localStorage</td>
            <td>Recordar el establecimiento seleccionado por usuarios con acceso territorial.</td>
            <td>Hasta cerrar sesión</td>
          </tr>
          <tr>
            <td>
              <code>consejos.portal.auth-state.v1</code>
            </td>
            <td>sessionStorage</td>
            <td>Acelerar la carga del perfil y permisos durante la sesión de navegación.</td>
            <td>Hasta cerrar la pestaña</td>
          </tr>
          <tr>
            <td>
              <code>consejos.portal.snapshot.*</code>
            </td>
            <td>sessionStorage</td>
            <td>Caché temporal de los datos del portal para evitar recargas innecesarias.</td>
            <td>Hasta cerrar la pestaña</td>
          </tr>
        </tbody>
      </table>

      <h2>4. Cookies de terceros durante el inicio de sesión</h2>
      <p>
        El acceso al portal se realiza con cuentas institucionales de <strong>Google Workspace</strong>. Durante el
        proceso de autenticación, Google puede establecer cookies propias en sus dominios (por ejemplo,{" "}
        <em>google.com</em> o <em>accounts.google.com</em>), regidas por la{" "}
        <a href="https://policies.google.com/technologies/cookies?hl=es" target="_blank" rel="noreferrer">
          política de cookies de Google
        </a>
        . Este sitio no controla esas cookies.
      </p>

      <h2>5. Cómo gestionar o eliminar este almacenamiento</h2>
      <p>Puedes eliminar en cualquier momento las cookies y el almacenamiento local desde tu navegador:</p>
      <ul>
        <li>
          <strong>Chrome / Edge:</strong> Configuración → Privacidad y seguridad → Borrar datos de navegación.
        </li>
        <li>
          <strong>Firefox:</strong> Ajustes → Privacidad y seguridad → Cookies y datos del sitio.
        </li>
        <li>
          <strong>Safari:</strong> Preferencias → Privacidad → Gestionar datos de sitios web.
        </li>
      </ul>
      <p>
        Ten presente que, al eliminar el almacenamiento del portal, se cerrará tu sesión y deberás autenticarte
        nuevamente. El sitio informativo seguirá funcionando con normalidad.
      </p>

      <h2>6. Cambios futuros</h2>
      <p>
        Si en el futuro se incorporaran cookies no esenciales (por ejemplo, de analítica), esta política se actualizará
        y se solicitará el consentimiento correspondiente antes de activarlas, conforme a la Ley N° 21.719.
      </p>

      <h2>7. Contacto</h2>
      <p>
        Para dudas sobre esta política, escribe a{" "}
        <a href="mailto:contacto@slepcolchagua.cl">contacto@slepcolchagua.cl</a>. Más información sobre el tratamiento
        de datos personales en la <a href="/privacidad/">Política de Privacidad</a>.
      </p>
    </LegalPage>
  );
}
