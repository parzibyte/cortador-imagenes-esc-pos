const $imagen = document.querySelector("#imagen");
const $canvas = document.querySelector("#canvas");
const $alto = document.querySelector("#alto");
const $ancho = document.querySelector("#ancho");
$ancho.value = 384; // Por defecto para 58mm
$imagen.addEventListener("change", async () => {
  if ($imagen.files.length <= 0) {
    return;
  }
  const primeraImagen = $imagen.files[0];
  const contexto = $canvas.getContext("2d");
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
      const reader = new FileReader();
      reader.onloadend = async () => {
        const cargaUtil = {
          "serial": "",
          // TODO: poner select de impresoras
          "nombreImpresora": "PT",
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
        const respuestaHttp = await fetch("http://localhost:8000/imprimir",
          {
            method: "POST",
            body: JSON.stringify(cargaUtil),
          });

        const respuestaComoJson = await respuestaHttp.json();
        if (respuestaComoJson.ok) {
          // Todo bien
          console.log("Impreso correctamente");
        } else {
          // El error está en la propiedad message
          console.error(respuestaComoJson.message)
        }

      }
      reader.onerror = () => {
        console.error(reader.error);
      }
      reader.readAsDataURL(pedazoDeImagenComoBlob);
    }
  }

})