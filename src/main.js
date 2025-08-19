const $imagen = document.querySelector("#imagen");
const $canvas = document.querySelector("#canvas");
$imagen.addEventListener("change", async () => {
  if ($imagen.files.length <= 0) {
    return;
  }
  const primeraImagen = $imagen.files[0];
  const contexto = $canvas.getContext("2d");
  const imagen = await createImageBitmap(primeraImagen, {})
  const medida = 700;
  const alto = 500;
  const ancho = 384;
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
      const elCanvas = Object.assign(document.createElement("canvas"), {
        height: altoPedazo-y,
        width: anchoPedazo-x,
      });
      elCanvas.getContext("2d").drawImage(imagen, x, y, anchoPedazo, altoPedazo, 0, 0, anchoPedazo, altoPedazo);
      document.body.append(elCanvas);
      console.log("Cortamos desde %o,%o hasta %o,%o", x, y, anchoPedazo, altoPedazo);
    }
  }
  return;
  $canvas.width = ancho;
  $canvas.height = alto;
  /**
   * Sería: al canvas ponerle la medida del pedazo
   * Convertirla a base64 e imprimirla
   * De hecho podríamos usar un OffscreenCanvas aunque estaría bien
   * previsualizar el resultado y hasta poner un antes y un después o
   * sea poner que quieres imprimir la pieza 1, pieza 2, etcétera
   */
  contexto.drawImage(imagen, 0, 0, ancho, alto, 0, 0, ancho, alto)
  return;
  let enlace = document.createElement('a');
  // El título
  enlace.download = "Canvas como imagen.jpg";
  // Convertir la imagen a Base64 y ponerlo en el enlace
  enlace.href = $canvas.toDataURL("image/jpeg", 1);
  // Hacer click en él
  enlace.click();

})