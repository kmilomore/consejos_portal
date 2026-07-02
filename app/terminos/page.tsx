import type { Metadata } from "next";
import { LegalPage } from "@/components/landing/legal-page";

export const metadata: Metadata = {
  title: "Términos y Condiciones · Portal Consejos Escolares",
  description:
    "Condiciones de uso del sitio informativo y del Portal Consejos Escolares del SLEP Colchagua.",
};

export default function TerminosPage() {
  return (
    <LegalPage
      eyebrow="Legal · Condiciones de uso"
      title="Términos y Condiciones"
      lede="Condiciones que rigen el uso del sitio informativo sobre Consejos Escolares y del portal de gestión del SLEP Colchagua."
      updatedAt="2 de julio de 2026"
    >
      <h2>1. Objeto y aceptación</h2>
      <p>
        Estos términos regulan el acceso y uso de este sitio web, compuesto por: (a) un{" "}
        <strong>sitio público informativo</strong> sobre los Consejos Escolares, de libre acceso; y (b) el{" "}
        <strong>Portal Consejos Escolares</strong>, plataforma de gestión de acceso restringido para personas usuarias
        autorizadas del Servicio Local de Educación Pública de Colchagua y sus establecimientos.
      </p>
      <p>
        El uso del sitio implica la aceptación de estos términos. Si no estás de acuerdo con ellos, debes abstenerte de
        utilizarlo.
      </p>

      <h2>2. Operador del sitio</h2>
      <p>
        El sitio es operado por el <strong>Servicio Local de Educación Pública de Colchagua (SLEP Colchagua)</strong>,
        órgano de la Administración del Estado creado por la Ley N° 21.040, en el marco de sus funciones de apoyo
        técnico-pedagógico y de gestión a los establecimientos educacionales de su territorio.
      </p>

      <h2>3. Uso del sitio público informativo</h2>
      <p>
        Los contenidos del sitio público tienen <strong>carácter informativo y orientador</strong>. En materia
        normativa, los únicos textos oficiales son los publicados en los medios legales correspondientes (Diario
        Oficial y plataforma Ley Chile de la Biblioteca del Congreso Nacional). Ante cualquier diferencia, prevalece el
        texto oficial.
      </p>
      <p>
        El sitio contiene enlaces a sitios de terceros (Mineduc, Superintendencia de Educación, BCN, YouTube, entre
        otros). El SLEP Colchagua no controla esos sitios ni responde por sus contenidos o políticas.
      </p>

      <h2>4. Acceso al portal de gestión</h2>
      <ul>
        <li>
          El acceso está reservado a personas usuarias <strong>expresamente autorizadas</strong>, mediante su cuenta
          institucional de Google Workspace. No existe registro público de cuentas.
        </li>
        <li>
          Las credenciales de acceso son <strong>personales e intransferibles</strong>. Cada usuario es responsable del
          uso que se haga con su cuenta y debe notificar de inmediato cualquier acceso no autorizado.
        </li>
        <li>
          La información registrada en el portal (programación, actas, asistentes, acuerdos y evidencias) debe ser{" "}
          <strong>veraz, pertinente y ajustada a las funciones</strong> de quien la registra.
        </li>
        <li>
          Los datos personales de terceros a los que se acceda a través del portal solo pueden usarse para los fines
          institucionales previstos, con deber de reserva y conforme a la{" "}
          <a href="/privacidad/">Política de Privacidad</a>.
        </li>
        <li>
          El SLEP Colchagua puede suspender o revocar accesos por razones de seguridad, término de funciones o uso
          contrario a estos términos.
        </li>
      </ul>

      <h2>5. Usos prohibidos</h2>
      <p>Queda prohibido, entre otros:</p>
      <ul>
        <li>
          Acceder o intentar acceder sin autorización al portal, a sus sistemas o a datos de terceros, conductas
          sancionadas por la <strong>Ley N° 21.459 sobre delitos informáticos</strong>.
        </li>
        <li>Vulnerar, escanear o poner a prueba la seguridad de la plataforma sin autorización expresa.</li>
        <li>Suplantar la identidad de otra persona u organismo.</li>
        <li>Introducir código malicioso o interferir en la disponibilidad del servicio.</li>
        <li>Extraer o reutilizar masivamente contenidos o datos del portal con fines ajenos a los institucionales.</li>
      </ul>

      <h2>6. Propiedad intelectual</h2>
      <p>
        Los contenidos institucionales del sitio (textos, marcas, logotipos y diseño) pertenecen al SLEP Colchagua o se
        utilizan con autorización, y están protegidos por la <strong>Ley N° 17.336 de Propiedad Intelectual</strong>.
        Los contenidos informativos del sitio público pueden citarse y compartirse con fines educativos indicando la
        fuente. Los textos legales citados son de dominio público.
      </p>

      <h2>7. Seguridad de la información</h2>
      <p>
        El SLEP Colchagua aplica medidas de seguridad conforme a la <strong>Ley N° 21.663, Ley Marco de
        Ciberseguridad</strong>, y a las instrucciones de la Agencia Nacional de Ciberseguridad (ANCI). Si detectas una
        vulnerabilidad o incidente de seguridad, repórtalo de forma responsable a{" "}
        <a href="mailto:contacto@slepcolchagua.cl">contacto@slepcolchagua.cl</a>, absteniéndote de explotarla o
        difundirla.
      </p>

      <h2>8. Disponibilidad y responsabilidad</h2>
      <p>
        El SLEP Colchagua procura la continuidad y correcto funcionamiento del sitio, pero no garantiza la
        disponibilidad ininterrumpida del servicio, que puede suspenderse temporalmente por mantención, seguridad o
        causas no imputables al servicio. El uso del sitio no reemplaza los canales formales de comunicación y
        tramitación establecidos por la normativa educacional.
      </p>

      <h2>9. Protección de datos personales</h2>
      <p>
        El tratamiento de datos personales asociado al sitio y al portal se rige por la{" "}
        <a href="/privacidad/">Política de Privacidad</a> y por la <a href="/cookies/">Política de Cookies</a>, que
        forman parte integrante de estos términos.
      </p>

      <h2>10. Modificaciones</h2>
      <p>
        Estos términos pueden actualizarse para reflejar cambios normativos o de la plataforma. Las modificaciones
        rigen desde su publicación en esta página, con indicación de la fecha de actualización.
      </p>

      <h2>11. Legislación aplicable</h2>
      <p>
        Estos términos se rigen por las leyes de la <strong>República de Chile</strong>. Cualquier controversia será de
        competencia de los tribunales chilenos, sin perjuicio de las normas de derecho público aplicables a los actos
        del SLEP Colchagua.
      </p>
    </LegalPage>
  );
}
