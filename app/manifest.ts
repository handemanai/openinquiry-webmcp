import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "OpenInquiry",
    short_name: "OpenInquiry",
    description:
      "A focused demonstration of publisher-controlled knowledge access built on WebMCP.",
    start_url: "/",
    display: "standalone",
    background_color: "#f2efe7",
    theme_color: "#111714",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
    ],
  };
}
