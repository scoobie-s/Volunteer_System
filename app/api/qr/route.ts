import QRCode from "qrcode";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");

  if (!token) {
    return NextResponse.json({ error: "Missing QR token." }, { status: 400 });
  }

  const png = await QRCode.toBuffer(token, {
    margin: 1,
    width: 320,
    color: {
      dark: "#111827",
      light: "#ffffff",
    },
  });

  return new NextResponse(new Uint8Array(png), {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=86400, immutable",
    },
  });
}
