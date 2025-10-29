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
const imprimirFragmentoDeImagen = (coleccionDeCanvas) => {
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
      $pDetalles.textContent = `#${numeroImagen} (Desde ${x},${y} hasta ${xFinalFragmento},${yFinalFragmento})`;

      const $pDescargar = document.createElement("p");
      $pDescargar.textContent = `Descargar`;

      $pDescargar.classList.add(
        "cursor-pointer",
        "underline",
        "hover:font-bold"
      );
      $pDescargar.addEventListener("click", () => {
        console.log("Descargamos")
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
        await imprimirFragmentoDeImagen([$canvasFragmento]);
      })
      $divAcciones.appendChild($pDetalles);
      $divAcciones.appendChild($pDescargar);
      $divAcciones.appendChild($pImprimir);
      $divContenedorDeCanvas.appendChild($divAcciones);
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
  const todosLosCanvas = document.querySelectorAll("canvas");
  await imprimirFragmentoDeImagen([...todosLosCanvas]);
})