// qrcode.js - Wrapper para qrcode.min.js (soporta versiones 1 a 40 sin límite de tamaño)

window.createQRCodeSVG = function(text, size = 220) {
  try {
    if (typeof qrcode === 'undefined') {
      throw new Error('Librería QR no cargada');
    }
    // Nivel L permite almacenar la máxima cantidad de caracteres (hasta 2953 bytes)
    const qr = qrcode(0, 'L');
    qr.addData(text);
    qr.make();
    
    // Generar SVG escalable limpio
    const svgString = qr.createSvgTag({
      cellSize: 4,
      margin: 4,
      scalable: true
    });
    
    return svgString;
  } catch (e) {
    console.error('Error generando QR:', e);
    return `<div style="padding:16px; color:#ef4444; font-size:12px; text-align:center;">Error generando QR: ${e.message}</div>`;
  }
};
