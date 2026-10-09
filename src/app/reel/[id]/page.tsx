import { notFound } from "next/navigation";
import { ReelClient } from "./reel-client";
import { findReel } from "@/reels";

export default async function ReelPage(props: PageProps<"/reel/[id]">) {
  const { id } = await props.params;
  const { render, cover, theme } = await props.searchParams;
  if (!findReel(id)) notFound();
  // reel 的定義裡有元件與函式，不能從 server 傳過去，只傳 id 讓 client 自己查
  return (
    <ReelClient
      id={id}
      render={render !== undefined}
      cover={cover !== undefined}
      theme={theme === "dark" || theme === "light" ? theme : undefined}
    />
  );
}
