

const nextConfig = {
  // Autorise les requêtes vers les domaines FDJ et data.gouv.fr
  async headers() {
    return [
      {
        source: "/api/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Cache-Control", value: "s-maxage=3600, stale-while-revalidate=7200" },
        ],
      },
    ];
  },
};

export default nextConfig;
