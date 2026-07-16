export default function PermissionsRedirect() { return null; }

export function getServerSideProps() {
  return { redirect: { destination: '/check', permanent: true } };
}
