import type { Metadata } from "next";
import { LegalPage } from "@/components/landing/legal-page";

export const metadata: Metadata = {
  title: "Política de Privacidad · Portal Consejos Escolares",
  description:
    "Política de tratamiento de datos personales del Portal Consejos Escolares del SLEP Colchagua, conforme a la normativa chilena de protección de datos.",
};

export default function PrivacidadPage() {
  return (
    <LegalPage
      eyebrow="Legal · Protección de datos personales"
      title="Política de Privacidad"
      lede="Cómo el Servicio Local de Educación Pública de Colchagua trata los datos personales en este sitio y en el Portal Consejos Escolares, conforme a la legislación chilena."
      updatedAt="2 de julio de 2026"
    >
      <h2>1. Responsable del tratamiento</h2>
      <p>
        El responsable del tratamiento de los datos personales es el <strong>Servicio Local de Educación Pública de
        Colchagua (SLEP Colchagua)</strong>, órgano público creado por la Ley N° 21.040 que crea el Sistema de
        Educación Pública, con domicilio en la Región del Libertador Bernardo O&apos;Higgins, Chile.
      </p>
      <p>
        Para consultas sobre esta política o sobre el tratamiento de tus datos, escribe a{" "}
        <a href="mailto:contacto@slepcolchagua.cl">contacto@slepcolchagua.cl</a>.
      </p>

      <h2>2. Marco normativo</h2>
      <p>Este sitio y el portal se rigen por la legislación chilena, en particular:</p>
      <ul>
        <li>
          <strong>Constitución Política de la República, art. 19 N° 4</strong> (reformado por la Ley N° 21.096), que
          garantiza el derecho a la protección de los datos personales.
        </li>
        <li>
          <strong>Ley N° 19.628</strong>, sobre protección de la vida privada y tratamiento de datos personales.
        </li>
        <li>
          <strong>Ley N° 21.719</strong>, que regula la protección y el tratamiento de los datos personales y crea la
          Agencia de Protección de Datos Personales, cuya plena vigencia comienza en diciembre de 2026. Esta política
          adopta anticipadamente sus principios de licitud, finalidad, proporcionalidad, calidad, seguridad,
          transparencia y responsabilidad.
        </li>
        <li>
          <strong>Ley N° 21.663</strong>, Ley Marco de Ciberseguridad, que establece deberes de seguridad de la
          información y de reporte de incidentes para los organismos del Estado.
        </li>
        <li>
          <strong>Ley N° 21.180</strong>, sobre Transformación Digital del Estado, y{" "}
          <strong>Ley N° 20.285</strong>, sobre acceso a la información pública.
        </li>
        <li>
          <strong>Decreto N° 24 de 2005 del Ministerio de Educación</strong>, que reglamenta los Consejos Escolares y
          justifica el registro de sus sesiones y acuerdos.
        </li>
      </ul>

      <h2>3. Qué datos tratamos</h2>
      <h3>Sitio público (esta página informativa)</h3>
      <p>
        La navegación por las secciones informativas <strong>no requiere registro ni entrega de datos personales</strong>.
        Solo se generan registros técnicos estándar del servidor que aloja el sitio (por ejemplo, dirección IP y fecha
        de la solicitud), utilizados exclusivamente con fines de seguridad y continuidad del servicio.
      </p>
      <h3>Portal de gestión (acceso restringido)</h3>
      <p>
        El Portal Consejos Escolares es una plataforma de uso institucional. Respecto de las personas usuarias
        autorizadas se tratan los siguientes datos:
      </p>
      <ul>
        <li>
          <strong>Identificación:</strong> nombre y correo electrónico institucional (cuenta Google Workspace del
          dominio del SLEP).
        </li>
        <li>
          <strong>Datos de contexto laboral:</strong> rol o cargo, establecimiento educacional asociado (RBD) y
          permisos de acceso.
        </li>
        <li>
          <strong>Registros de gestión:</strong> programación de sesiones, actas, asistentes a las sesiones de los
          consejos escolares, acuerdos adoptados y evidencias adjuntas.
        </li>
        <li>
          <strong>Registros técnicos y de auditoría:</strong> fecha y hora de acceso, acciones relevantes realizadas
          en la plataforma y eventos de seguridad.
        </li>
      </ul>

      <h2>4. Finalidad y base de licitud</h2>
      <p>Los datos se tratan exclusivamente para:</p>
      <ul>
        <li>Gestionar la programación, el registro y el seguimiento de los consejos escolares del territorio.</li>
        <li>Dar cumplimiento y trazabilidad a las obligaciones del Decreto N° 24 de 2005 y de la Ley N° 20.845.</li>
        <li>Elaborar métricas agregadas de funcionamiento a nivel de establecimiento y territorio.</li>
        <li>Garantizar la seguridad de la plataforma y auditar los accesos.</li>
      </ul>
      <p>
        La base de licitud del tratamiento es el <strong>cumplimiento de las funciones legales del SLEP Colchagua</strong>{" "}
        como órgano de la Administración del Estado (art. 20 de la Ley N° 19.628 y disposiciones equivalentes de la
        Ley N° 21.719), dentro del ámbito de su competencia.
      </p>

      <h2>5. Encargados y destinatarios</h2>
      <p>
        Los datos se alojan en servicios de infraestructura tecnológica contratados como encargados de tratamiento
        (plataforma de base de datos y autenticación en la nube, y Google Workspace para el inicio de sesión
        institucional), los que solo tratan los datos por cuenta del SLEP y bajo deberes de confidencialidad y
        seguridad.
      </p>
      <p>
        <strong>Los datos no se venden ni se ceden a terceros con fines comerciales.</strong> Solo podrán comunicarse a
        otros órganos públicos cuando una ley lo autorice o lo exija (por ejemplo, requerimientos de la
        Superintendencia de Educación o del Ministerio de Educación).
      </p>

      <h2>6. Plazo de conservación</h2>
      <p>
        Los registros de sesiones y actas de los consejos escolares se conservan mientras subsistan las obligaciones
        legales de registro y archivo de la documentación oficial del servicio. Los datos de cuentas de usuario se
        conservan mientras la persona mantenga funciones que justifiquen su acceso y, posteriormente, solo con fines de
        auditoría por el tiempo estrictamente necesario.
      </p>

      <h2>7. Derechos de las personas titulares</h2>
      <p>Puedes ejercer en cualquier momento los derechos que reconoce la ley:</p>
      <ul>
        <li><strong>Acceso:</strong> conocer qué datos tuyos se tratan y con qué finalidad.</li>
        <li><strong>Rectificación:</strong> corregir datos inexactos, incompletos o desactualizados.</li>
        <li><strong>Supresión o cancelación:</strong> solicitar la eliminación cuando el tratamiento carezca de fundamento legal.</li>
        <li><strong>Oposición:</strong> oponerte a tratamientos específicos en los casos que la ley contempla.</li>
        <li><strong>Portabilidad y bloqueo</strong>, conforme a la Ley N° 21.719 a partir de su plena vigencia.</li>
      </ul>
      <p>
        Para ejercerlos, escribe a <a href="mailto:contacto@slepcolchagua.cl">contacto@slepcolchagua.cl</a> indicando tu
        nombre, el derecho que deseas ejercer y los antecedentes del caso. Una vez en funciones, también podrás
        reclamar ante la <strong>Agencia de Protección de Datos Personales</strong>.
      </p>
      <p>
        El ejercicio de estos derechos se armoniza con los deberes de registro y archivo de la documentación oficial de
        los consejos escolares: los datos contenidos en actas oficiales pueden estar sujetos a conservación
        obligatoria.
      </p>

      <h2>8. Medidas de seguridad</h2>
      <p>
        En cumplimiento de la Ley N° 21.663 y del principio de seguridad del tratamiento, el portal aplica, entre
        otras, las siguientes medidas:
      </p>
      <ul>
        <li>Autenticación exclusiva mediante cuentas institucionales de Google Workspace (OAuth 2.0), sin contraseñas propias.</li>
        <li>Control de acceso por roles y por establecimiento (RBD), con políticas de acceso a nivel de base de datos.</li>
        <li>Cifrado de las comunicaciones mediante HTTPS/TLS.</li>
        <li>Registro de auditoría de accesos y cambios relevantes.</li>
        <li>Gestión y reporte de incidentes de ciberseguridad conforme a los deberes aplicables a los organismos del Estado ante la Agencia Nacional de Ciberseguridad (ANCI) y el CSIRT Nacional.</li>
      </ul>
      <p>
        Si detectas una vulnerabilidad o un posible incidente de seguridad, repórtalo a{" "}
        <a href="mailto:contacto@slepcolchagua.cl">contacto@slepcolchagua.cl</a>.
      </p>

      <h2>9. Cookies y almacenamiento local</h2>
      <p>
        El uso de cookies y tecnologías de almacenamiento local se describe en la{" "}
        <a href="/cookies/">Política de Cookies</a>.
      </p>

      <h2>10. Cambios a esta política</h2>
      <p>
        Esta política puede actualizarse para reflejar cambios normativos —en particular la entrada en plena vigencia
        de la Ley N° 21.719— o cambios en la plataforma. La versión vigente estará siempre publicada en esta página con
        su fecha de actualización.
      </p>
    </LegalPage>
  );
}
