import Head from 'next/head';
import '@/styles/globals.css';

export default function App({ Component, pageProps }) {
  return <><Head><title>SpiceDB UI</title><meta name="description" content="A guarded operational interface for SpiceDB" /></Head><Component {...pageProps} /></>;
}
