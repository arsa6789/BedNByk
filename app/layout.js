import "./globals.css";

export const metadata = {
  title: "BedNByk – Experience | Adventure",
  description: "Find hotels, rental cars and bikes for your next adventure. Compare prices and book in a few taps.",
  openGraph: {
    title: "BedNByk – Experience | Adventure",
    description: "Hotels, cars and bikes for your next adventure.",
    type: "website",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f4f2ed" },
    { media: "(prefers-color-scheme: dark)", color: "#0b1019" },
  ],
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
