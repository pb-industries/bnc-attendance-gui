import { LoaderFunction, redirect } from "remix";
import { getPlayerByUserId } from "~/models/user.server";
import { getUserId } from "~/session.server";

export const loader: LoaderFunction = async ({ request }) => {
  const userId = await getUserId(request);
  if (!userId) {
    return redirect("/");
  }
  const player = await getPlayerByUserId(BigInt(userId));
  return redirect(`/players/${player?.id}`);
};
