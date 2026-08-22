/**
 * app/api/recibos/ocr/route.ts
 * ----------------------------------------------------------------------------
 * Recibe una foto de un ticket/factura físico, la guarda en Supabase Storage
 * y usa un modelo con visión (Claude) para extraer los campos estructurados
 * que necesita la tabla `recibos` (comercio, monto, fecha, confianza).
 *
 * Por qué un modelo de visión y no un OCR tradicional (Tesseract, etc.):
 * los tickets mexicanos varían muchísimo en formato (impresora térmica
 * desgastada, tickets doblados, distintos layouts por comercio) y un modelo
 * de visión con instrucciones puede además RAZONAR sobre el layout —
 * distinguir "TOTAL" de "SUBTOTAL" o de "CAMBIO", que es donde el OCR
 * clásico por regex suele fallar.
 * ----------------------------------------------------------------------------
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 30;

const PROMPT_EXTRACCION = `Eres un extractor de datos de tickets de compra mexicanos.
Analiza la imagen y devuelve ÚNICAMENTE un objeto JSON (sin texto adicional,
sin markdown) con esta forma exacta:

{
  "emisor_nombre": string | null,      // nombre del comercio, ej. "OXXO", "Walmart"
  "emisor_rfc": string | null,          // RFC si aparece impreso
  "monto_total": number | null,         // el TOTAL final pagado, no el subtotal
  "fecha_emision": string | null,       // formato YYYY-MM-DD
  "categoria_sugerida": string | null,  // una de: comida, transporte, super, salud, entretenimiento, otro
  "confianza": number                   // 0.0–1.0, qué tan seguro estás de estos datos
}

Reglas:
- Si el ticket muestra "TOTAL" y "SUBTOTAL" por separado, usa siempre TOTAL.
- Si algún campo no es legible o no aparece, usa null en vez de inventar.
- "confianza" debe bajar si la imagen está borrosa, cortada o el ticket
  está muy desgastado (impresoras térmicas se decoloran con el tiempo).
- No expliques tu razonamiento, solo responde el JSON.`;

interface ExtraccionTicket {
  emisor_nombre: string | null;
  emisor_rfc: string | null;
  monto_total: number | null;
  fecha_emision: string | null;
  categoria_sugerida: string | null;
  confianza: number;
}

function limpiarRespuestaJSON(texto: string): string {
  // El modelo a veces envuelve el JSON en ```json ... ``` pese a la instrucción;
  // esto lo deja a prueba de esos casos.
  return texto.replace(/```json\s*|```/g, "").trim();
}

async function extraerConClaude(base64Imagen: string, mediaType: string): Promise<ExtraccionTicket> {
  const respuesta = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY!,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 500,
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: mediaType, data: base64Imagen } },
            { type: "text", text: PROMPT_EXTRACCION },
          ],
        },
      ],
    }),
  });

  if (!respuesta.ok) {
    throw new Error(`Error del servicio de extracción: ${respuesta.status}`);
  }

  const data = await respuesta.json();
  const bloqueTexto = data.content.find((b: any) => b.type === "text");
  if (!bloqueTexto) throw new Error("El modelo no devolvió texto extraíble");

  const json = limpiarRespuestaJSON(bloqueTexto.text);
  return JSON.parse(json) as ExtraccionTicket;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const formData = await request.formData();
    const archivo = formData.get("imagen") as File | null;

    if (!archivo) {
      return NextResponse.json({ error: "Falta el archivo 'imagen'" }, { status: 400 });
    }

    const tiposValidos = ["image/jpeg", "image/png", "image/webp"];
    if (!tiposValidos.includes(archivo.type)) {
      return NextResponse.json(
        { error: "Formato no soportado. Usa JPEG, PNG o WEBP." },
        { status: 415 }
      );
    }

    // 1) Subir la imagen original a Storage (auditoría / re-procesar después)
    const bytes = Buffer.from(await archivo.arrayBuffer());
    const rutaStorage = `${user.id}/recibos/${Date.now()}-${archivo.name}`;

    const { error: errorSubida } = await supabase.storage
      .from("recibos")
      .upload(rutaStorage, bytes, { contentType: archivo.type });

    if (errorSubida) {
      return NextResponse.json({ error: "No se pudo guardar la imagen" }, { status: 500 });
    }

    // 2) Extraer datos estructurados con el modelo de visión
    const base64 = bytes.toString("base64");
    let extraccion: ExtraccionTicket;
    try {
      extraccion = await extraerConClaude(base64, archivo.type);
    } catch (err) {
      // Si la extracción falla, igual guardamos el recibo para revisión manual
      // en vez de perder la foto del usuario.
      extraccion = {
        emisor_nombre: null,
        emisor_rfc: null,
        monto_total: null,
        fecha_emision: null,
        categoria_sugerida: null,
        confianza: 0,
      };
    }

    // 3) Insertar el recibo. estado = 'pendiente_revision' siempre que la
    //    confianza sea baja o falte el monto — el usuario confirma antes
    //    de que se cree la transacción real (ver ScannerOCR.jsx).
    const { data: recibo, error: errorInsert } = await supabase
      .from("recibos")
      .insert({
        usuario_id: user.id,
        tipo_origen: "ocr_foto",
        storage_path: rutaStorage,
        emisor_nombre: extraccion.emisor_nombre,
        emisor_rfc: extraccion.emisor_rfc,
        monto_total: extraccion.monto_total,
        fecha_emision: extraccion.fecha_emision,
        confianza_ocr: extraccion.confianza,
        estado: "pendiente_revision",
      })
      .select()
      .single();

    if (errorInsert) {
      return NextResponse.json({ error: "No se pudo guardar el recibo" }, { status: 500 });
    }

    return NextResponse.json({
      recibo,
      categoriaSugerida: extraccion.categoria_sugerida,
      requiereRevision: extraccion.confianza < 0.75 || !extraccion.monto_total,
    });
  } catch (error) {
    console.error("Error en /api/recibos/ocr:", error);
    return NextResponse.json({ error: "Error inesperado al procesar el ticket" }, { status: 500 });
  }
}
