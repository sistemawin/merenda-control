import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
  return (
    <Html lang="pt-BR">
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="manifest" href="manifest.json"/>
        <meta name="theme-color" content="#0b1220"/>
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png"/>
        

      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}