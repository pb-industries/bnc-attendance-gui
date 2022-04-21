import { LoaderFunction, redirect } from "remix";
import { getUserId } from "~/session.server";

export const loader: LoaderFunction = async ({ request }) => {
  const userId = await getUserId(request);
  return redirect(`/players/${userId}`);
};
