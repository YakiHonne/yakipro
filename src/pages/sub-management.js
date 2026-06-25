export default function SubManagementRedirect() {
  return null;
}

export async function getServerSideProps() {
  return {
    redirect: {
      destination: "/subscription",
      permanent: false,
    },
  };
}
