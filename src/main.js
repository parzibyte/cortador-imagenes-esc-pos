import "./style.css"
import JSZip from "jszip"
const $imagen = document.querySelector("#imagen");
const $alto = document.querySelector("#alto");
const $ancho = document.querySelector("#ancho");
const $resultados = document.querySelector("#resultados");
const $imprimir = document.querySelector("#imprimir");
const $impresoras = document.querySelector("#impresoras");
const $contenedorFragmentos = document.querySelector("#contenedorFragmentos");
const $descargar = document.querySelector("#descargar");
$ancho.value = 384; // Por defecto para 58mm

const registrarMensaje = (mensaje) => {
  $resultados.textContent += "\n" + new Date().toLocaleString() + " " + mensaje;

}
const llenarSelectImpresoras = async () => {
  try {
    const respuestaHttp = await fetch("http://localhost:8000/impresoras")
    const impresoras = await respuestaHttp.json();
    for (const impresora of impresoras) {
      const option = Object.assign(document.createElement("option"), {
        value: impresora,
        text: impresora,
      })
      $impresoras.appendChild(option);
    }
  } catch (e) {
    registrarMensaje(e.message);
  }
}
llenarSelectImpresoras();
const descargarColeccionDeCanvas = async (coleccionDeCanvas) => {
  const zip = new JSZip();
  for (let i = 0; i < coleccionDeCanvas.length; i++) {
    const canvas = coleccionDeCanvas[i];
    const data = canvas.toDataURL("image/png").split(",")[1];
    zip.file(`imagen_${i}.png`, data, { base64: true });
  }
  const resultado = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(resultado);
  const a = document.createElement("a");
  a.href = url;
  a.download = "imagenes.zip";
  a.click();
  URL.revokeObjectURL(url);
}
$descargar.addEventListener("click", () => {
  const textoOriginal = $descargar.textContent;
  $descargar.textContent = "Descargando...";
  descargarColeccionDeCanvas([...document.querySelectorAll("canvas")]);
  $descargar.textContent = textoOriginal;
})
const imprimirColeccionDeCanvas = (coleccionDeCanvas) => {
  const nombreImpresora = $impresoras.value;
  return new Promise(async (resolve, reject) => {
    const operaciones = [
      {
        "nombre": "Iniciar",
        "argumentos": []
      },
    ];
    const canvasComoOperaciones = coleccionDeCanvas.map($canvas => {
      return {
        nombre: "ImprimirImagenEnBase64",
        argumentos: [
          $canvas.toDataURL(),
          $canvas.width,
          0,
          true
        ]
      };
    })
    operaciones.push(...canvasComoOperaciones);
    operaciones.push(
      // Un Feed por si no tienen cortador
      {
        "nombre": "Feed",
        "argumentos": [1],
      },
      {
        "nombre": "Corte",
        "argumentos": [
          1
        ]
      }
    )
    const cargaUtil = {
      "serial": "",
      nombreImpresora,
      operaciones,
    };
    try {
      registrarMensaje("Imprimiendo ...");
      const respuestaHttp = await fetch("http://localhost:8000/imprimir",
        {
          method: "POST",
          body: JSON.stringify(cargaUtil),
        });

      const respuestaComoJson = await respuestaHttp.json();
      if (respuestaComoJson.ok) {
        registrarMensaje("Impreso correctamente");
        resolve();
      } else {
        // El error está en la propiedad message
        reject(respuestaComoJson)
      }
    } catch (e) {
      reject(e)
    }
  })
}

const generarCanvasPrevisualizaciones = async () => {
  if ($imagen.files.length <= 0) {
    return;
  }
  const imagen = await createImageBitmap($imagen.files[0]);
  $contenedorFragmentos.replaceChildren();
  const altoMaximoEstablecidoPorUsuario = $alto.valueAsNumber;
  const anchoMaximoEstablecidoPorUsuario = $ancho.valueAsNumber;
  let numeroImagen = 1;
  for (let xInicio = 0; xInicio < imagen.width; xInicio += anchoMaximoEstablecidoPorUsuario) {
    const $divRow = document.createElement("div");
    $divRow.classList.add("flex", "flex-col");
    for (let yInicio = 0; yInicio < imagen.height; yInicio += altoMaximoEstablecidoPorUsuario) {
      let ancho = anchoMaximoEstablecidoPorUsuario;
      let alto = altoMaximoEstablecidoPorUsuario;
      if (xInicio + anchoMaximoEstablecidoPorUsuario > imagen.width) {
        ancho = imagen.width - xInicio;
      }
      if (yInicio + altoMaximoEstablecidoPorUsuario > imagen.height) {
        alto = imagen.height - yInicio;
      }
      const xFin = xInicio + ancho;
      const yFin = yInicio + alto;
      const $divContenedorDeCanvas = document.createElement("div");
      $divContenedorDeCanvas.classList.add("border", "border-blue-200", "rounded-md", "relative", "inline-block");
      const $divAcciones = document.createElement("div");
      $divAcciones.classList.add(
        "absolute",
        "top-0",
        "left-0",
        "text-white",
        "bg-black/20",
        "p-2"
      )
      const $pDetalles = document.createElement("p");
      $pDetalles.textContent = `#${numeroImagen} (Desde ${xInicio},${yInicio} hasta ${xFin},${yFin})`;

      const $pDescargar = document.createElement("p");
      $pDescargar.textContent = `Descargar`;

      $pDescargar.classList.add(
        "cursor-pointer",
        "underline",
        "hover:font-bold"
      );
      $pDescargar.addEventListener("click", () => {
        let enlace = document.createElement('a');
        enlace.download = "Canvas como imagen.jpg";
        enlace.href = $canvasFragmento.toDataURL("image/jpeg", 1);
        enlace.click();
      })
      const $pImprimir = document.createElement("p");
      $pImprimir.textContent = `Imprimir`;
      $pImprimir.classList.add(
        "cursor-pointer",
        "underline",
        "hover:font-bold"
      );
      $pImprimir.addEventListener("click", async () => {
        await imprimirColeccionDeCanvas([$canvasFragmento]);
      })
      $divAcciones.appendChild($pDetalles);
      $divAcciones.appendChild($pDescargar);
      $divAcciones.appendChild($pImprimir);
      $divContenedorDeCanvas.appendChild($divAcciones);
      const $canvasFragmento = document.createElement("canvas");
      $canvasFragmento.width = ancho;
      $canvasFragmento.height = alto;
      const contextoCanvasRecienCreado = $canvasFragmento.getContext("2d");
      contextoCanvasRecienCreado.drawImage(imagen, xInicio, yInicio, ancho, alto, 0, 0, ancho, alto);
      $divContenedorDeCanvas.append($canvasFragmento)
      $divRow.append($divContenedorDeCanvas);
      numeroImagen++;
    }
    $contenedorFragmentos.append($divRow);
  }

}
$imagen.addEventListener("change", async () => {
  const imagen = await createImageBitmap($imagen.files[0]);
  $alto.value = imagen.height;
  generarCanvasPrevisualizaciones();
})
$alto.addEventListener("change", generarCanvasPrevisualizaciones)
$ancho.addEventListener("change", generarCanvasPrevisualizaciones)
$imprimir.addEventListener("click", async () => {
  const textoOriginal = $imprimir.textContent;
  if ($imagen.files.length <= 0) {
    registrarMensaje("No has seleccionado ninguna imagen");
    return;
  }
  if (!$impresoras.value) {
    registrarMensaje("No has seleccionado ninguna impresora");
    return;
  }
  const todosLosCanvas = document.querySelectorAll("canvas");
  $imprimir.textContent = "Imprimiendo...";
  await imprimirColeccionDeCanvas([...todosLosCanvas]);
  $imprimir.textContent = textoOriginal;
})