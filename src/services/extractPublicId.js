const extractPublicId = (url) => {
  const parts = url.split("/");
  const uploadIndex = parts.findIndex((part) => part === "upload") + 1;
  const publicIdWithExtension = parts.slice(uploadIndex + 1).join("/");
  const publicId = publicIdWithExtension.split(".")[0]; // Hapus ekstensi file
  return publicId;
};

module.exports = extractPublicId;
