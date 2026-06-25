export default function SubPlansRedirect() {
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
