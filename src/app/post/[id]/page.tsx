import { PostEditor } from "@/components/post-editor";

export default async function PostPage(props: PageProps<"/post/[id]">) {
  const { id } = await props.params;
  // 檔名可以是中文，走到網址上就是 percent-encoded 的；貼文在記憶體裡是以
  // 檔名為 key，所以要先解回來才找得到。
  return <PostEditor postId={decodeURIComponent(id)} />;
}
