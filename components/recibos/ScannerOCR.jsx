import React, { useRef, useState } from "react";

/**
 * ScannerOCR — migrado al sistema "Emerald Finance", reutilizando el patrón
 * visual del mockup de referencia (vista de cámara con retícula + bottom
 * sheet bento de resultados), pero ahora funcional y editable:
 *  1) captura → vista de cámara con retícula de enfoque
 *  2) procesando → línea de escaneo animada mientras /api/recibos/ocr corre
 *  3) confirmar → bottom sheet bento, con los mismos campos editables antes
 *     de guardar (nunca se guarda un monto mal leído sin que el usuario
 *     lo confirme).
 */

const CATEGORIAS = ["comida", "transporte", "super", "salud", "entretenimiento", "otro"];

export default function ScannerOCR({ onGuardado }) {
  const inputRef = useRef(null);
  const [paso, setPaso] = useState("captura");
  const [previewUrl, setPreviewUrl] = useState(null);
  const [datos, setDatos] = useState(null);
  const [requiereRevision, setRequiereRevision] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  function abrirCamara() {
    inputRef.current?.click();
  }

  async function manejarArchivo(e) {
    const archivo = e.target.files?.[0];
    if (!archivo) return;

    setPreviewUrl(URL.createObjectURL(archivo));
    setPaso("procesando");
    setErrorMsg("");

    try {
      const formData = new FormData();
      formData.append("imagen", archivo);
      const resp = await fetch("/api/recibos/ocr", { method: "POST", body: formData });
      if (!resp.ok) throw new Error("No se pudo procesar el ticket");

      const json = await resp.json();
      setDatos({
        comercio: json.recibo.emisor_nombre ?? "",
        monto: json.recibo.monto_total ?? "",
        fecha: json.recibo.fecha_emision ?? new Date().toISOString().slice(0, 10),
        categoria: json.categoriaSugerida ?? "otro",
        reciboId: json.recibo.id,
      });
      setRequiereRevision(json.requiereRevision);
      setPaso("confirmar");
    } catch {
      setErrorMsg("No pudimos leer el ticket. Intenta de nuevo o captúralo a mano.");
      setPaso("error");
    }
  }

  function reiniciar() {
    setPaso("captura");
    setPreviewUrl(null);
    setDatos(null);
    setErrorMsg("");
  }

  function guardarTransaccion() {
    onGuardado?.(datos);
    reiniciar();
  }

  return (
    <div className="h-screen w-full max-w-md mx-auto bg-inverse-surface flex flex-col relative overflow-hidden">
      <input ref={inputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={manejarArchivo} />

      {/* Controles superiores */}
      <div className="absolute top-0 left-0 w-full p-margin-mobile flex justify-between items-center z-10">
        <button className="w-10 h-10 bg-on-surface/20 backdrop-blur-md rounded-full flex items-center justify-center text-white">
          <span className="material-symbols-outlined">close</span>
        </button>
        <div className="bg-on-surface/40 backdrop-blur-md px-4 py-2 rounded-full flex items-center gap-2 text-white">
          <span
            className={`w-2 h-2 rounded-full ${paso === "procesando" ? "bg-primary-fixed animate-pulse" : "bg-primary-fixed"}`}
          />
          <span className="font-label-md text-label-md">
            {paso === "captura" && "Buscando recibo…"}
            {paso === "procesando" && "Leyendo el ticket…"}
            {paso === "confirmar" && "Recibo detectado"}
            {paso === "error" && "No se pudo leer"}
          </span>
        </div>
        <div className="w-10" />
      </div>

      {/* Vista de cámara / preview */}
      <div className="absolute inset-0 z-0 bg-inverse-surface flex items-center justify-center">
        {previewUrl ? (
          <img src={previewUrl} alt="Ticket capturado" className="w-full h-full object-cover opacity-70" />
        ) : (
          <span className="material-symbols-outlined text-white/20 text-[64px]">photo_camera</span>
        )}
        <div className="absolute inset-0 bg-black/40" />

        {(paso === "captura" || paso === "procesando") && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3/4 h-1/2 border-2 border-primary-fixed/50 rounded-xl">
            <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-primary-fixed rounded-tl-xl" />
            <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-primary-fixed rounded-tr-xl" />
            <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-primary-fixed rounded-bl-xl" />
            <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-primary-fixed rounded-br-xl" />
            {paso === "procesando" && (
              <div
                className="absolute left-0 w-full h-[2px] bg-primary-fixed shadow-[0_0_8px_2px_rgba(111,251,190,0.5)]"
                style={{ animation: "scan 2s linear infinite", top: "10%" }}
              />
            )}
          </div>
        )}
      </div>

      {/* Botón de captura */}
      {paso === "captura" && (
        <div className="absolute bottom-10 w-full flex justify-center z-10">
          <button
            onClick={abrirCamara}
            className="w-16 h-16 rounded-full bg-white border-4 border-white/40 active:scale-90 transition-transform"
          />
        </div>
      )}

      {/* Error */}
      {paso === "error" && (
        <div className="absolute bottom-0 left-0 w-full bg-surface-container-lowest rounded-t-3xl z-20 px-margin-mobile pt-6 pb-8 text-center">
          <span className="material-symbols-outlined text-error text-[28px]">error</span>
          <p className="text-sm font-medium mt-2">{errorMsg}</p>
          <button
            onClick={reiniciar}
            className="mt-4 bg-primary text-on-primary text-sm font-semibold rounded-xl py-2.5 px-5 inline-flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-[16px]">refresh</span>
            Intentar de nuevo
          </button>
        </div>
      )}

      {/* Bottom sheet — resultados bento, editables */}
      {paso === "confirmar" && datos && (
        <div className="absolute bottom-0 left-0 w-full bg-surface rounded-t-3xl shadow-[0_-8px_30px_rgba(0,0,0,0.12)] z-20">
          <div className="w-full flex justify-center py-3">
            <div className="w-12 h-1 bg-outline-variant rounded-full" />
          </div>
          <div className="px-margin-mobile pb-margin-mobile">
            <div className="flex items-center gap-2 mb-4">
              {requiereRevision ? (
                <>
                  <span className="material-symbols-outlined text-tertiary text-[16px]">warning</span>
                  <p className="text-xs text-tertiary font-medium">Revisa estos datos, la lectura no fue 100% clara</p>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-primary text-[16px]">check_circle</span>
                  <p className="text-xs text-primary font-medium">Datos leídos correctamente</p>
                </>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 mb-5">
              {/* Comercio */}
              <div className="col-span-2 bg-surface-container-lowest border border-surface-container-high rounded-xl p-4 flex items-center gap-3">
                <div className="w-11 h-11 rounded-full bg-primary-container/20 flex items-center justify-center text-primary flex-shrink-0">
                  <span className="material-symbols-outlined">storefront</span>
                </div>
                <div className="flex-1">
                  <p className="text-xs text-on-surface-variant mb-1">Comercio</p>
                  <input
                    value={datos.comercio}
                    onChange={(e) => setDatos({ ...datos, comercio: e.target.value })}
                    className="w-full bg-transparent font-headline-md text-body-lg font-semibold outline-none"
                    placeholder="Nombre del comercio"
                  />
                </div>
              </div>

              {/* Monto */}
              <div className="col-span-1 bg-surface-container-lowest border border-surface-container-high rounded-xl p-4 relative overflow-hidden">
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary" />
                <p className="text-xs text-on-surface-variant mb-1">Total (MXN)</p>
                <input
                  value={datos.monto}
                  onChange={(e) => setDatos({ ...datos, monto: e.target.value })}
                  type="number"
                  inputMode="decimal"
                  className="w-full bg-transparent font-currency-display text-[22px] font-bold outline-none"
                  placeholder="0.00"
                />
              </div>

              {/* Fecha */}
              <div className="col-span-1 bg-surface-container-lowest border border-surface-container-high rounded-xl p-4 relative overflow-hidden">
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-tertiary-container" />
                <p className="text-xs text-on-surface-variant mb-1">Fecha</p>
                <input
                  value={datos.fecha}
                  onChange={(e) => setDatos({ ...datos, fecha: e.target.value })}
                  type="date"
                  className="w-full bg-transparent font-label-md text-[14px] outline-none"
                />
              </div>

              {/* Categoría */}
              <div className="col-span-2 flex items-center gap-2 flex-wrap mt-1">
                <span className="text-sm text-on-surface-variant">Categoría:</span>
                {CATEGORIAS.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setDatos({ ...datos, categoria: cat })}
                    className={`px-3 py-1 rounded-full text-xs font-semibold capitalize ${
                      datos.categoria === cat
                        ? "bg-tertiary-container/30 text-tertiary"
                        : "bg-surface-container text-on-surface-variant"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={guardarTransaccion}
              disabled={!datos.monto}
              className="w-full bg-primary text-on-primary font-body-lg text-body-lg font-semibold py-4 rounded-xl shadow-md active:scale-[0.98] transition-transform flex items-center justify-center gap-2 disabled:opacity-40"
            >
              <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>add_circle</span>
              Adjuntar a Gasto
            </button>
            <button onClick={reiniciar} className="w-full mt-3 text-primary font-body-md text-center py-2">
              Reescanear
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes scan {
          0% { top: 10%; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { top: 90%; opacity: 0; }
        }
      `}</style>
    </div>
  );
}
