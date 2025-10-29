import "./style.css"
const $imagen = document.querySelector("#imagen");
const $alto = document.querySelector("#alto");
const $ancho = document.querySelector("#ancho");
const $resultados = document.querySelector("#resultados");
const $imprimir = document.querySelector("#imprimir");
const $impresoras = document.querySelector("#impresoras");
const $contenedorFragmentos = document.querySelector("#contenedorFragmentos");
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
const imprimirFragmentoDeImagen = (nombreImpresora, pedazoDeImagenComoBlob, anchoPedazo, x) => {
  return new Promise(async (resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = async () => {
      const cargaUtil = {
        "serial": "",
        "nombreImpresora": nombreImpresora,
        "operaciones": [
          {
            "nombre": "Iniciar",
            "argumentos": []
          },
          {
            "nombre": "ImprimirImagenEnBase64",
            "argumentos": [
              reader.result,
              anchoPedazo - x,
              0,
              true
            ]
          },
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
        ]
      };
      try {

        const respuestaHttp = await fetch("http://localhost:8000/imprimir",
          {
            method: "POST",
            body: JSON.stringify(cargaUtil),
          });

        const respuestaComoJson = await respuestaHttp.json();
        if (respuestaComoJson.ok) {
          resolve();
        } else {
          // El error está en la propiedad message
          reject(respuestaComoJson)
        }
      } catch (e) {
        reject(e)
      }

    }
    reader.onerror = () => {
      reject(reader.error)
    }
    reader.readAsDataURL(pedazoDeImagenComoBlob);
  })
}

const generarCanvasPrevisualizaciones = async () => {
  if ($imagen.files.length <= 0) {
    return;
  }
  const imagen = await createImageBitmap($imagen.files[0]);
  $contenedorFragmentos.replaceChildren();

  const alto = $alto.valueAsNumber;
  const ancho = $ancho.valueAsNumber;
  let numeroImagen = 1;
  for (let x = 0; x < imagen.width; x += ancho) {
    const $divRow = document.createElement("div");
    $divRow.classList.add("flex", "flex-col");
    for (let y = 0; y < imagen.height; y += alto) {

      let xFinalFragmento = x + ancho;
      let yFinalFragmento = y + alto;
      if (x + ancho > imagen.width) {
        xFinalFragmento = imagen.width;
      }
      if (y + alto > imagen.height) {
        yFinalFragmento = imagen.height;
      }
      const $divContenedorDeCanvas = document.createElement("div");
      $divContenedorDeCanvas.classList.add("border", "border-blue-200", "rounded-md", "relative", "inline-block");
      const $p = document.createElement("p");
      $p.textContent = `#${numeroImagen} (Desde ${x},${y} hasta ${xFinalFragmento},${yFinalFragmento}). Clic para descargar`

      $p.classList.add(
        "cursor-pointer",
        "absolute",
        "top-0",
        "left-0",
        "text-white",
        "bg-black/50",
        "p-1"
      );
      $p.addEventListener("click", ()=>{
        // TODO: descargar
        console.log("Descargamos")
      })
      $divContenedorDeCanvas.appendChild($p);
      const $canvasFragmento = document.createElement("canvas");
      $canvasFragmento.width = ancho;
      $canvasFragmento.height = alto;
      const contextoCanvasRecienCreado = $canvasFragmento.getContext("2d");
      contextoCanvasRecienCreado.drawImage(imagen, x, y, ancho, alto, 0, 0, ancho, alto);
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
  if ($imagen.files.length <= 0) {
    registrarMensaje("No has seleccionado ninguna imagen");
    return;
  }
  if (!$impresoras.value) {
    registrarMensaje("No has seleccionado ninguna impresora");
    return;
  }
  const primeraImagen = $imagen.files[0];
  const imagen = await createImageBitmap(primeraImagen, {})
  // El papel térmico no tiene un límite en su alto
  $alto.value = imagen.height;

  const alto = $alto.valueAsNumber;
  const ancho = $ancho.valueAsNumber;
  for (let x = 0; x < imagen.width; x += ancho) {
    for (let y = 0; y < imagen.height; y += alto) {
      let anchoPedazo = x + ancho;
      let altoPedazo = y + alto;
      if (x + ancho > imagen.width) {
        anchoPedazo = imagen.width;
      }
      if (y + alto > imagen.height) {
        altoPedazo = imagen.height;
      }
      const offscreenCanvas = new OffscreenCanvas(anchoPedazo - x, altoPedazo - y);
      offscreenCanvas.getContext("2d").drawImage(imagen, x, y, anchoPedazo, altoPedazo, 0, 0, anchoPedazo, altoPedazo);
      const pedazoDeImagenComoBlob = await offscreenCanvas.convertToBlob();
      try {
        await imprimirFragmentoDeImagen($impresoras.value, pedazoDeImagenComoBlob, anchoPedazo, x);
        const $canvasFragmento = document.createElement("canvas");
        $canvasFragmento.width = anchoPedazo;
        $canvasFragmento.height = altoPedazo;
        const contextoCanvasRecienCreado = $canvasFragmento.getContext("2d");
        contextoCanvasRecienCreado.drawImage(await createImageBitmap(pedazoDeImagenComoBlob), 0, 0);
        contextoCanvasRecienCreado.font = "20px Arial";
        contextoCanvasRecienCreado.fillStyle = "blue";
        contextoCanvasRecienCreado.fillText("Qué tranza", 20, 50);
        document.body.append($canvasFragmento);

        registrarMensaje(`Impreso fragmento desde ${x},${y} hasta ${x + anchoPedazo},${y + altoPedazo}`);
      } catch (e) {
        console.log(e)
        registrarMensaje(e.message);
        return
      }
    }
  }
})