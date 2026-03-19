import { supabase } from "../lib/supabase";

function generateSafeFileName(file) {
  const ext = file.name.split(".").pop() || "file";

  let baseName = file.name
    .replace(/\.[^/.]+$/, "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");

  if (!baseName) baseName = "file";

  return `${Date.now()}-${baseName}.${ext}`;
}

export default async function uploadFile(file) {
  const fileName = generateSafeFileName(file);

  const { data, error } = await supabase.storage
    .from("chat-files") // your bucket
    .upload(fileName, file);

  if (error) {
    console.error(error);
    return null;
  }

  const { data: publicUrl } = supabase.storage
    .from("chat-files")
    .getPublicUrl(fileName);

  return publicUrl.publicUrl;
}
