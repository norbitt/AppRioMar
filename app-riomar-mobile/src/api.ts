import { BACKEND_URL } from "./config";

type RNFile = { uri: string; name: string; type: string };

export async function validateReceipt(uri: string) {
  const file: RNFile = { uri, name: "nota.jpg", type: "image/jpeg" };
  const form = new FormData();
  form.append("file", file as unknown as Blob);
  const res = await fetch(`${BACKEND_URL}/api/validate`, {
    method: "POST",
    body: form
  });
  const json = await res.json();
  return json;
}
