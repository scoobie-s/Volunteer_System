import QRCode from "qrcode";

export async function generateQrDataUrl(token: string) {
  return QRCode.toDataURL(token, {
    margin: 1,
    width: 240,
    color: {
      dark: "#111827",
      light: "#ffffff",
    },
  });
}
